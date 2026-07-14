/**
 * TVS · Import istorije sa starog sajta (Faza 1 dopuna):
 * turniri + konkurencije + prijave + rekonstruisani žrebovi (kostur,
 * pozicije, propagacija) + mečevi sa setovima + bodovi + rang liste.
 *
 * Ulaz:  migration-data_2/migration-data/{turniri_ucesce,mecevi,members_list}.jsonl
 * Izlaz: scripts/out/history/*.sql (gitignored) — primenjuje se redom kao admin.
 * Idempotentno: 00_cleanup briše sve istorijske zapise (legacy 'ist-%'/'gost-%').
 *
 * Pokretanje: pnpm tsx scripts/import-history.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "migration-data_2", "migration-data");
const OUT = path.join(ROOT, "scripts", "out", "history");

type Ucesce = {
  player_id: number;
  ime_turnira: string;
  trajanje: string;
  tip: "Singl" | "Dubl" | "Mix";
  kategorija: string;
  osvojeni_poeni: string;
};
type Mec = {
  player_id: number;
  prvi_igrac: string;
  turnir: string;
  kolo: string;
  drugi_igrac: string;
  rezultat: string | null;
};

const warnings: string[] = [];
const q = (v: string | number | null | undefined) =>
  v === null || v === undefined
    ? "NULL"
    : typeof v === "number"
      ? String(v)
      : `'${String(v).replace(/'/g, "''")}'`;

function loadJsonl<T>(name: string): T[] {
  return readFileSync(path.join(DATA, name), "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function loadEnv() {
  const env = readFileSync(path.join(ROOT, ".env.local"), "utf-8");
  const get = (n: string) => env.match(new RegExp(`^${n}=(.+)$`, "m"))?.[1]?.trim() ?? "";
  return { url: get("NEXT_PUBLIC_SUPABASE_URL"), key: get("NEXT_PUBLIC_SUPABASE_ANON_KEY") };
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const lname = (s: string) => norm(s).toLowerCase();

const FOLD: Record<string, string> = { č: "c", ć: "c", š: "s", ž: "z", đ: "dj" };
const slugify = (s: string) =>
  lname(s)
    .replace(/[čćšžđ]/g, (ch) => FOLD[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 60);

/** "Aug 29, 2018 - Aug 30, 2018" → ["2018-08-29","2018-08-30"] */
const MESECI: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};
function parseTrajanje(t: string): [string, string] {
  const m = t.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}) - ([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/);
  if (!m) throw new Error(`trajanje: ${t}`);
  const d = (mon: string, day: string, y: string) => `${y}-${MESECI[mon]}-${day.padStart(2, "0")}`;
  return [d(m[1], m[2], m[3]), d(m[4], m[5], m[6])];
}

/** Rezultat starog sajta → setovi + status. */
export function parseOldResult(raw: string | null): {
  sets: { g1: number; g2: number }[];
  status: "zavrsen" | "walkover";
} {
  const text = (raw ?? "").trim();
  if (!text || /^itf/i.test(text)) return { sets: [], status: "zavrsen" };
  if (/w\.?o\.?/i.test(text)) return { sets: [], status: "walkover" };

  const sets: { g1: number; g2: number }[] = [];
  for (const tok of text.split(/[\s,]+/)) {
    const m = tok.match(/^(\d{1,2})[:\-](\d{1,2})$/);
    if (m) {
      sets.push({ g1: +m[1], g2: +m[2] });
      continue;
    }
    if (/^\d{2}$/.test(tok)) {
      sets.push({ g1: +tok[0], g2: +tok[1] });
      continue;
    }
    if (/^\d{3}$/.test(tok)) {
      // "108" → 10:8 · "910" → 9:10
      if (tok.startsWith("10")) sets.push({ g1: 10, g2: +tok[2] });
      else sets.push({ g1: +tok[0], g2: +tok.slice(1) });
    }
  }
  return { sets, status: "zavrsen" };
}

function detectSerija(name: string, maxPoeni: number): string {
  const m = name.match(/serija\s*(2000|1000|500|250)/i);
  if (m) return `s${m[1]}`;
  if (maxPoeni >= 2000) return "s2000";
  if (maxPoeni >= 1000) return "s1000";
  if (maxPoeni >= 500) return "s500";
  return "s250";
}

const ROMAN = new Set(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]);

async function main() {
  mkdirSync(OUT, { recursive: true });
  const { url, key } = loadEnv();
  const supabase = createClient(url, key);

  // svi igrači: legacy_id → uuid, ime → kandidati
  const playersByLegacy = new Map<string, string>();
  const playersByName = new Map<string, string[]>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("players")
      .select("id, legacy_id, ime, prezime")
      .range(from, from + 999);
    if (error) throw error;
    for (const p of data ?? []) {
      if (p.legacy_id) playersByLegacy.set(p.legacy_id, p.id);
      const k = lname(`${p.ime} ${p.prezime}`);
      playersByName.set(k, [...(playersByName.get(k) ?? []), p.id]);
    }
    if (!data || data.length < 1000) break;
  }
  console.log(`igrača u bazi: ${playersByLegacy.size}`);

  const ucesca = loadJsonl<Ucesce>("turniri_ucesce.jsonl");
  const mecevi = loadJsonl<Mec>("mecevi.jsonl");

  // ---------- 1) turniri ----------
  type Turnir = {
    id: string; // determinist. uuid ključ radi kompaktnog SQL-a rešavamo u SQL-u? ne — koristimo md5 slug
    legacy: string;
    naziv: string;
    od: string;
    doo: string;
    maxPoeni: number;
    kategorije: Set<string>;
  };
  const turniri = new Map<string, Turnir>();
  const slugSeen = new Map<string, number>();
  for (const u of ucesca) {
    let t = turniri.get(u.ime_turnira);
    if (!t) {
      const [od, doo] = parseTrajanje(u.trajanje);
      let slug = `ist-${slugify(u.ime_turnira)}`;
      const n = slugSeen.get(slug) ?? 0;
      slugSeen.set(slug, n + 1);
      if (n > 0) slug = `${slug}-${n + 1}`;
      t = { id: "", legacy: slug, naziv: norm(u.ime_turnira), od, doo, maxPoeni: 0, kategorije: new Set() };
      turniri.set(u.ime_turnira, t);
    }
    t.maxPoeni = Math.max(t.maxPoeni, Number(u.osvojeni_poeni) || 0);
    t.kategorije.add(u.kategorija);
  }
  console.log(`turnira: ${turniri.size}`);

  // deterministički uuid-i (md5 u SQL-u nezgodan za reference iz skripte) — računamo ovde
  const { createHash } = await import("node:crypto");
  const detUuid = (s: string) => {
    const h = createHash("md5").update(s).digest("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  };
  for (const t of turniri.values()) t.id = detUuid(`turnir:${t.legacy}`);

  // ---------- 2) konkurencije ----------
  const DISC: Record<string, string> = { Singl: "singl", Dubl: "dubl", Mix: "miks" };
  type Ev = { id: string; turnir: Turnir; kategorija: string; disciplina: string };
  const events = new Map<string, Ev>();
  const evKey = (turnir: string, kat: string, disc: string) => `${turnir}${kat}${disc}`;
  for (const u of ucesca) {
    const t = turniri.get(u.ime_turnira)!;
    const disc = DISC[u.tip];
    const k = evKey(u.ime_turnira, u.kategorija, disc);
    if (!events.has(k)) {
      events.set(k, {
        id: detUuid(`event:${t.legacy}:${u.kategorija}:${disc}`),
        turnir: t,
        kategorija: u.kategorija,
        disciplina: disc,
      });
    }
  }
  console.log(`konkurencija: ${events.size}`);

  // učešće perspektivnog igrača: (player, turnir) → ucesca
  const ucesceByPT = new Map<string, Ucesce[]>();
  for (const u of ucesca) {
    const k = `${u.player_id}${u.ime_turnira}`;
    ucesceByPT.set(k, [...(ucesceByPT.get(k) ?? []), u]);
  }

  // poeni po (konkurencija, igrač) — jak signal za pobednika meča
  const poeniByEvPlayer = new Map<string, number>();
  for (const u of ucesca) {
    const pid = playersByLegacy.get(String(u.player_id));
    if (!pid) continue;
    const ev = events.get(evKey(u.ime_turnira, u.kategorija, DISC[u.tip]))!;
    poeniByEvPlayer.set(`${ev.id}${pid}`, Number(u.osvojeni_poeni) || 0);
  }

  // ---------- 3) gosti (imena bez kartona) ----------
  const guests = new Map<string, { id: string; legacy: string; ime: string; prezime: string }>();
  const resolveByName = (name: string, turnir: string): string | null => {
    const k = lname(name);
    const ids = playersByName.get(k);
    if (ids?.length === 1) return ids[0];
    if (ids && ids.length > 1) {
      // višeznačno ime: prednost onome ko ima učešće na tom turniru
      for (const u of ucesca) {
        if (u.ime_turnira === turnir) {
          const pid = playersByLegacy.get(String(u.player_id));
          if (pid && ids.includes(pid) && lname(name) === k) return pid;
        }
      }
      return ids[0];
    }
    return guests.get(k)?.id ?? null;
  };
  // registruj goste
  for (const r of mecevi) {
    for (const n of [r.prvi_igrac, r.drugi_igrac]) {
      const k = lname(n);
      if (!playersByName.has(k) && !guests.has(k)) {
        const parts = norm(n).split(" ");
        guests.set(k, {
          id: detUuid(`gost:${k}`),
          legacy: `gost-${slugify(n)}`,
          ime: parts[0],
          prezime: parts.slice(1).join(" ") || parts[0],
        });
      }
    }
  }
  console.log(`gostiju (nova imena): ${guests.size}`);

  // ---------- 4) mečevi: dedup + rešavanje strana + event ----------
  type M = {
    event: Ev;
    kolo: number;
    p1: string | null;
    p2: string | null;
    sets: { g1: number; g2: number }[];
    status: string;
    winnerSlot: 1 | 2;
    pozicija?: number;
    next?: { target: M; slot: 1 | 2 };
  };
  const grouped = new Map<string, Mec[]>();
  for (const r of mecevi) {
    const pair = [lname(r.prvi_igrac), lname(r.drugi_igrac)].sort().join("");
    const k = `${r.turnir}${r.kolo}${pair}`;
    grouped.set(k, [...(grouped.get(k) ?? []), r]);
  }

  const matchesByEvent = new Map<string, M[]>();
  let preskoceno = 0;
  for (const rs of grouped.values()) {
    const r0 = rs[0];
    // event: učešće perspektivnog igrača (singl > dubl > miks)
    let ev: Ev | undefined;
    for (const r of rs) {
      const us = ucesceByPT.get(`${r.player_id}${r.turnir}`) ?? [];
      const u =
        us.find((x) => x.tip === "Singl") ?? us.find((x) => x.tip === "Dubl") ?? us[0];
      if (u) {
        ev = events.get(evKey(r.turnir, u.kategorija, DISC[u.tip]))!;
        break;
      }
    }
    if (!ev) {
      preskoceno++;
      continue;
    }

    // strane: perspektivni ID sigurno; druga strana po imenu/perspektivi drugog zapisa
    let p1: string | null = null;
    let p2: string | null = null;
    for (const r of rs) {
      const pid = playersByLegacy.get(String(r.player_id));
      if (!pid) continue;
      // players tabela: ime = prva reč, prezime = ostatak → uporedi celo ime
      const isPrvi = lname(r.prvi_igrac) !== lname(r.drugi_igrac) &&
        (playersByName.get(lname(r.prvi_igrac))?.includes(pid) ?? false);
      const isDrugi = playersByName.get(lname(r.drugi_igrac))?.includes(pid) ?? false;
      if (isPrvi && !p1) p1 = pid;
      else if (isDrugi && !p2) p2 = pid;
    }
    p1 = p1 ?? resolveByName(r0.prvi_igrac, r0.turnir);
    p2 = p2 ?? resolveByName(r0.drugi_igrac, r0.turnir);
    if (!p1 && !p2) {
      preskoceno++;
      continue;
    }

    const { sets, status } = parseOldResult(r0.rezultat);
    const m: M = {
      event: ev,
      kolo: Number(r0.kolo) || 1,
      p1,
      p2,
      sets,
      status,
      winnerSlot: 1, // stari sajt: pobednik je prvi_igrac (validira se progresijom)
    };
    matchesByEvent.set(ev.id, [...(matchesByEvent.get(ev.id) ?? []), m]);
  }
  const ukupnoMeceva = [...matchesByEvent.values()].reduce((a, b) => a + b.length, 0);
  console.log(`mečeva (dedup): ${ukupnoMeceva} · preskočeno: ${preskoceno}`);

  // ---------- 5) rekonstrukcija pozicija + kostur ----------
  let progresijaIspravki = 0;
  let poeniIspravki = 0;
  const drawsRows: string[] = [];
  // po žrebu: mečevi + setovi zajedno (fajl nikad ne seče žreb → paralelna primena)
  const drawBlocks: { matchRows: string[]; setRows: string[] }[] = [];

  for (const [evId, ms] of matchesByEvent) {
    const maxKolo = Math.max(...ms.map((m) => m.kolo));
    const kostur = Math.min(128, Math.max(8, 2 ** maxKolo));
    const drawId = detUuid(`draw:${evId}`);
    drawsRows.push(
      `  (${q(drawId)}, ${q(evId)}, 'eliminacija', ${kostur}, 0, 'zakljucan', 'istorijski-uvoz')`,
    );

    const byKolo = new Map<number, M[]>();
    for (const m of ms) byKolo.set(m.kolo, [...(byKolo.get(m.kolo) ?? []), m]);

    // pobednik: (1) progresija u sledeće kolo, (2) više osvojenih poena
    // u konkurenciji (pobednik je uvek stigao dalje), (3) prvi_igrac.
    const inKolo = (kolo: number, pid: string | null) =>
      pid !== null && (byKolo.get(kolo) ?? []).some((m) => m.p1 === pid || m.p2 === pid);
    for (const m of ms) {
      const w1 = m.kolo < maxKolo && inKolo(m.kolo + 1, m.p1);
      const w2 = m.kolo < maxKolo && inKolo(m.kolo + 1, m.p2);
      if (w1 && !w2) {
        m.winnerSlot = 1;
        continue;
      }
      if (!w1 && w2) {
        m.winnerSlot = 2;
        progresijaIspravki++;
        continue;
      }
      const b1 = poeniByEvPlayer.get(`${evId}${m.p1}`);
      const b2 = poeniByEvPlayer.get(`${evId}${m.p2}`);
      if (b1 !== undefined && b2 !== undefined && b1 !== b2) {
        if (b2 > b1) {
          m.winnerSlot = 2;
          poeniIspravki++;
        }
      }
    }

    // pozicije: od finala unazad
    const finalRound = byKolo.get(maxKolo) ?? [];
    finalRound.forEach((m, i) => (m.pozicija = i + 1));
    for (let kolo = maxKolo - 1; kolo >= 1; kolo--) {
      const cur = byKolo.get(kolo) ?? [];
      const next = byKolo.get(kolo + 1) ?? [];
      const used = new Set<M>();
      for (const nm of next) {
        if (nm.pozicija === undefined) continue;
        for (const [slot, pid] of [[1, nm.p1], [2, nm.p2]] as const) {
          if (!pid) continue;
          const src = cur.find(
            (c) => !used.has(c) &&
              ((c.winnerSlot === 1 ? c.p1 : c.p2) === pid ||
                (c.p1 === pid || c.p2 === pid)),
          );
          if (src) {
            used.add(src);
            src.pozicija = nm.pozicija * 2 - (slot === 1 ? 1 : 0);
            src.next = { target: nm, slot };
          }
        }
      }
      // nepovezani dobijaju slobodne pozicije
      const zauzete = new Set(cur.filter((c) => c.pozicija !== undefined).map((c) => c.pozicija));
      let slobodna = 1;
      for (const c of cur) {
        if (c.pozicija !== undefined) continue;
        while (zauzete.has(slobodna)) slobodna++;
        c.pozicija = slobodna;
        zauzete.add(slobodna);
      }
    }
    // duplikati pozicija u istom kolu (loši podaci) → pomeri
    for (const [kolo, list] of byKolo) {
      const seen = new Set<number>();
      for (const m of list) {
        while (m.pozicija !== undefined && seen.has(m.pozicija)) m.pozicija++;
        if (m.pozicija !== undefined) seen.add(m.pozicija);
      }
      void kolo;
    }

    const block: { matchRows: string[]; setRows: string[] } = { matchRows: [], setRows: [] };
    // finale (najveće kolo) prvo → self-FK next_match_id uvek pokazuje na već ubačen red
    const msSorted = [...ms].sort((a, b) => b.kolo - a.kolo);
    for (const m of msSorted) {
      const mid = detUuid(`match:${drawId}:${m.kolo}:${m.pozicija}`);
      const nid = m.next
        ? detUuid(`match:${drawId}:${m.next.target.kolo}:${m.next.target.pozicija}`)
        : null;
      block.matchRows.push(
        `  (${q(mid)}, ${q(drawId)}, ${m.kolo}, ${m.pozicija}, ${q(m.p1)}, ${q(m.p2)}, ${q(m.status)}, ${m.winnerSlot}, ${q(nid)}, ${m.next ? m.next.slot : "NULL"})`,
      );
      m.sets.forEach((s, i) =>
        block.setRows.push(`  (${q(mid)}, ${i + 1}, ${s.g1}, ${s.g2})`),
      );
    }
    drawBlocks.push(block);
  }
  console.log(`ispravki pobednika: progresija ${progresijaIspravki} · poeni ${poeniIspravki}`);

  // ---------- 6) SQL fajlovi ----------
  const files: [string, string][] = [];

  files.push([
    "00_cleanup.sql",
    [
      "-- istorijski uvoz: čišćenje pre ponovnog uvoza (idempotentno)",
      "delete from public.ranking_points where tournament_id in (select id from public.tournaments where legacy_id like 'ist-%');",
      "delete from public.tournaments where legacy_id like 'ist-%';",
      "delete from public.players where legacy_id like 'gost-%' and id not in (select player_id from public.entries union select player1_id from public.matches where player1_id is not null union select player2_id from public.matches where player2_id is not null);",
    ].join("\n"),
  ]);

  if (guests.size) {
    files.push([
      "01_gosti.sql",
      "insert into public.players (id, legacy_id, ime, prezime, drzava) values\n" +
        [...guests.values()]
          .map((g) => `  (${q(g.id)}, ${q(g.legacy)}, ${q(g.ime)}, ${q(g.prezime)}, 'RS')`)
          .join(",\n") +
        "\non conflict (legacy_id) do nothing;",
    ]);
  }

  files.push([
    "02_turniri.sql",
    "insert into public.tournaments (id, legacy_id, naziv, serija, sistem, datum_od, datum_do, status) values\n" +
      [...turniri.values()]
        .map((t) => {
          const roman = [...t.kategorije].filter((k) => ROMAN.has(k)).length;
          const sistem = roman * 2 >= t.kategorije.size ? "kvalitativni" : "starosni";
          return `  (${q(t.id)}, ${q(t.legacy)}, ${q(t.naziv)}, ${q(detectSerija(t.naziv, t.maxPoeni))}, ${q(sistem)}, ${q(t.od)}, ${q(t.doo)}, 'zavrsen')`;
        })
        .join(",\n") +
      "\non conflict (legacy_id) do nothing;",
  ]);

  chunk(files, "03_konkurencije",
    [...events.values()].map(
      (e) => `  (${q(e.id)}, ${q(e.turnir.id)}, ${q(e.kategorija)}, ${q(e.disciplina)})`,
    ),
    400,
    "insert into public.tournament_events (id, turnir_id, kategorija, disciplina) values",
    "on conflict do nothing;");

  // entries: (event_id, player legacy) — join na players
  const entryRows: string[] = [];
  let entryPreskok = 0;
  for (const u of ucesca) {
    const pid = playersByLegacy.get(String(u.player_id));
    if (!pid) {
      entryPreskok++;
      continue;
    }
    const ev = events.get(evKey(u.ime_turnira, u.kategorija, DISC[u.tip]))!;
    entryRows.push(`  (${q(ev.id)}, ${q(pid)})`);
  }
  chunk(files, "04_prijave", entryRows, 500,
    "insert into public.entries (event_id, player_id, status) select v.e::uuid, v.p::uuid, 'prijavljen' from (values",
    ") as v(e, p) on conflict (event_id, player_id) do nothing;");

  chunk(files, "05_zrebovi", drawsRows, 400,
    "insert into public.draws (id, event_id, tip, kostur, broj_nosilaca, status, rng_seed) values",
    "on conflict (event_id) do nothing;");

  // mečevi + njihovi setovi zajedno, žreb se nikad ne seče između fajlova
  // → fajlovi su samostalni i mogu da se primenjuju paralelno
  {
    let curM: string[] = [];
    let curS: string[] = [];
    let n = 1;
    const flush = () => {
      if (!curM.length) return;
      let sql =
        "insert into public.matches (id, draw_id, kolo, pozicija, player1_id, player2_id, status, winner_slot, next_match_id, next_slot) values\n" +
        curM.join(",\n") +
        "\non conflict (draw_id, kolo, pozicija) do nothing;";
      if (curS.length) {
        sql +=
          "\n\ninsert into public.match_sets (match_id, set_no, gem1, gem2) values\n" +
          curS.join(",\n") +
          "\non conflict (match_id, set_no) do nothing;";
      }
      files.push([`06_mecevi_${String(n++).padStart(2, "0")}.sql`, sql]);
      curM = [];
      curS = [];
    };
    for (const b of drawBlocks) {
      if (curM.length && curM.length + b.matchRows.length > 500) flush();
      curM.push(...b.matchRows);
      curS.push(...b.setRows);
    }
    flush();
  }

  // bodovi
  const pointRows: string[] = [];
  for (const u of ucesca) {
    const bodovi = Number(u.osvojeni_poeni) || 0;
    if (bodovi <= 0) continue;
    const pid = playersByLegacy.get(String(u.player_id));
    if (!pid) continue;
    const t = turniri.get(u.ime_turnira)!;
    const aktivno = new Date(new Date(t.doo).getTime() + 364 * 86400000)
      .toISOString()
      .slice(0, 10);
    pointRows.push(
      `  (${q(pid)}, ${q(t.id)}, ${q(u.kategorija)}, ${q(DISC[u.tip])}, ${bodovi}, ${q(aktivno)})`,
    );
  }
  chunk(files, "08_bodovi", pointRows, 400,
    "insert into public.ranking_points (player_id, tournament_id, kategorija, disciplina, bodovi, aktivno_do) values",
    ";");

  // rang liste: pun preračun za tekuću nedelju, sve kombinacije
  files.push([
    "09_rang.sql",
    `do $$
declare
  v_week date := date_trunc('week', now())::date;
  v_n_best int := coalesce((select n_best from public.seasons where aktivna limit 1), 8);
  v_pair record;
begin
  delete from public.rankings where nedelja = v_week;
  for v_pair in select distinct kategorija, disciplina from public.ranking_points loop
    insert into public.rankings (player_id, kategorija, disciplina, bodovi, mesto, broj_turnira, nedelja)
    select player_id, v_pair.kategorija, v_pair.disciplina, bodovi,
           rank() over (order by bodovi desc), broj_turnira, v_week
    from (
      select player_id, sum(bodovi) as bodovi, count(*) as broj_turnira
      from (
        select player_id, bodovi,
               row_number() over (partition by player_id order by bodovi desc) as rn
        from public.ranking_points
        where kategorija = v_pair.kategorija and disciplina = v_pair.disciplina
          and (aktivno_do is null or aktivno_do >= current_date)
      ) rp
      where rn <= v_n_best
      group by player_id
    ) sums;
  end loop;
end $$;`,
  ]);

  for (const [name, content] of files) {
    writeFileSync(path.join(OUT, name), content, "utf-8");
  }
  writeFileSync(path.join(OUT, "warnings.txt"), warnings.join("\n"), "utf-8");
  console.log(
    `\nSQL fajlova: ${files.length} → scripts/out/history/ · prijava: ${entryRows.length} (preskok ${entryPreskok}) · bodova: ${pointRows.length} · setova: ${drawBlocks.reduce((a, b) => a + b.setRows.length, 0)}`,
  );
  console.log("redosled primene:", files.map(([n]) => n).join(", "));
}

function chunk(
  files: [string, string][],
  prefix: string,
  rows: string[],
  size: number,
  header: string,
  footer: string,
) {
  for (let i = 0, n = 1; i < rows.length; i += size, n++) {
    files.push([
      `${prefix}_${String(n).padStart(2, "0")}.sql`,
      `${header}\n${rows.slice(i, i + size).join(",\n")}\n${footer}`,
    ]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
