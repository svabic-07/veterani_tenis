/**
 * TVS · Demo žreb za verifikaciju prikaza (Faza 3, pre sudijskog portala).
 *
 * Čita igrače kategorije I (anon ključ), generiše eliminacioni žreb za
 * Oktagon Open · Kat. I · Singl kroz src/lib/draw engine, odigra par mečeva
 * i ispiše idempotentan SQL u scripts/out/demo_draw.sql.
 *
 * Pokretanje:  pnpm tsx scripts/demo-draw.ts
 * Primena:     SQL primeniti kao admin (Supabase MCP / SQL editor).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { generateKnockout, advanceWinner, type GeneratedDraw } from "../src/lib/draw";

const ROOT = path.resolve(import.meta.dirname, "..");
const RNG_SEED = "demo-oktagon-2026";

function loadEnv(): { url: string; key: string } {
  const env = readFileSync(path.join(ROOT, ".env.local"), "utf-8");
  const get = (name: string) =>
    env.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]?.trim() ?? "";
  return { url: get("NEXT_PUBLIC_SUPABASE_URL"), key: get("NEXT_PUBLIC_SUPABASE_ANON_KEY") };
}

const q = (v: string | number | null | undefined) =>
  v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;

async function main() {
  const { url, key } = loadEnv();
  const supabase = createClient(url, key);

  // konkurencija: Oktagon Open · I · singl
  const { data: tour, error: e1 } = await supabase
    .from("tournaments")
    .select("id, naziv, tournament_events ( id, kategorija, disciplina )")
    .eq("legacy_id", "oktagon-open-2026")
    .single();
  if (e1 || !tour) throw new Error(`turnir nije nađen: ${e1?.message}`);
  const event = tour.tournament_events.find(
    (e: { kategorija: string; disciplina: string }) =>
      e.kategorija === "I" && e.disciplina === "singl",
  );
  if (!event) throw new Error("konkurencija I/singl ne postoji");

  // 12 igrača kategorije I (stabilan izbor: po prezimenu)
  const { data: players, error: e2 } = await supabase
    .from("players")
    .select("id, ime, prezime, klub_id")
    .eq("kategorija", "I")
    .order("prezime")
    .limit(12);
  if (e2 || !players || players.length < 12) throw new Error(`igrači: ${e2?.message}`);

  // sintetički bodovi za nošenje (rang liste još nisu obračunate)
  const entries = players.map((p, i) => ({
    id: p.id,
    points: 1200 - i * 50,
    clubId: p.klub_id,
  }));

  let draw: GeneratedDraw = generateKnockout(entries, RNG_SEED);

  // odigraj 2 nerešena meča 1. kola radi prikaza rezultata
  const playable = draw.matches
    .filter((m) => m.round === 1 && m.status === "zakazan" && m.p1 && m.p2)
    .slice(0, 2);
  const setsPlayed: Record<string, { g1: number; g2: number }[]> = {};
  playable.forEach((m, i) => {
    const sets = i === 0 ? [{ g1: 6, g2: 3 }, { g1: 7, g2: 5 }] : [{ g1: 6, g2: 4 }, { g1: 3, g2: 6 }, { g1: 7, g2: 6 }];
    draw = advanceWinner(draw, m.round, m.position, 1, { sets });
    setsPlayed[`${m.round}:${m.position}`] = sets;
  });

  // ---- SQL ----
  const drawId = randomUUID();
  const matchIds = new Map<string, string>();
  for (const m of draw.matches) matchIds.set(`${m.round}:${m.position}`, randomUUID());

  const lines: string[] = [
    "-- TVS demo žreb (generisano: scripts/demo-draw.ts) — idempotentno",
    `delete from public.draws where event_id = ${q(event.id)};`,
    `delete from public.entries where event_id = ${q(event.id)};`,
    "",
    "insert into public.entries (event_id, player_id, status, seed, bodovi_snapshot) values",
    entries
      .map((e) => {
        const seedNo = draw.seeds.findIndex((s) => s.id === e.id) + 1;
        return `  (${q(event.id)}, ${q(e.id)}, 'prijavljen', ${seedNo > 0 ? seedNo : "NULL"}, ${e.points})`;
      })
      .join(",\n") + ";",
    "",
    `insert into public.draws (id, event_id, tip, kostur, broj_nosilaca, status, rng_seed, seed_izvor) values`,
    `  (${q(drawId)}, ${q(event.id)}, 'eliminacija', ${draw.kostur}, ${draw.brojNosilaca}, 'objavljen', ${q(RNG_SEED)},`,
    `   ${q(JSON.stringify(draw.seeds.map((s, i) => ({ seed: i + 1, player_id: s.id, bodovi: s.points }))))}::jsonb);`,
    "",
    "insert into public.matches (id, draw_id, kolo, pozicija, grupa, player1_id, player2_id, seed1, seed2, status, winner_slot, next_match_id, next_slot) values",
    draw.matches
      .map((m) => {
        const id = matchIds.get(`${m.round}:${m.position}`)!;
        const nextId = m.next ? matchIds.get(`${m.next.round}:${m.next.position}`)! : null;
        return `  (${q(id)}, ${q(drawId)}, ${m.round}, ${m.position}, ${q(m.group ?? null)}, ${q(m.p1?.id ?? null)}, ${q(m.p2?.id ?? null)}, ${q(m.seed1 ?? null)}, ${q(m.seed2 ?? null)}, ${q(m.status)}, ${q(m.winnerSlot ?? null)}, ${q(nextId)}, ${q(m.next?.slot ?? null)})`;
      })
      .join(",\n") + ";",
  ];

  const setRows: string[] = [];
  for (const [key2, sets] of Object.entries(setsPlayed)) {
    const matchId = matchIds.get(key2)!;
    sets.forEach((s, i) =>
      setRows.push(`  (${q(matchId)}, ${i + 1}, ${s.g1}, ${s.g2})`),
    );
  }
  if (setRows.length > 0) {
    lines.push("", "insert into public.match_sets (match_id, set_no, gem1, gem2) values", setRows.join(",\n") + ";");
  }

  const outDir = path.join(ROOT, "scripts", "out");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "demo_draw.sql"), lines.join("\n"), "utf-8");

  console.log(`event: ${event.id} · kostur ${draw.kostur} · ${draw.brojNosilaca} nosilaca · ${draw.matches.length} mečeva`);
  console.log("SQL → scripts/out/demo_draw.sql");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
