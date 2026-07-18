import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Db = SupabaseClient<Database>;

/**
 * Automatski izveštaj sa završenog turnira za vesti:
 * uvod (gde/kada/serija/domaćin/sudija), pobednici po konkurencijama,
 * rezultati finala i polufinala (grupe: konačan plasman po pobedama).
 */

const SERIES_LABEL: Record<string, string> = {
  s2000: "Serija 2000",
  s1000: "Serija 1000",
  s500: "Serija 500",
  s250: "Serija 250",
  master: "Master",
};
const DISC_LABEL: Record<string, string> = { singl: "Singl", dubl: "Dubl", miks: "Miks" };
const KAT_RANK: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 };
const catRank = (k: string) => KAT_RANK[k] ?? 100 + (Number.parseInt(k, 10) || 999);

type P = { ime: string; prezime: string } | null;
const name = (p: P) => (p ? `${p.ime} ${p.prezime}` : "?");

function fmtDates(od: string | null, doD: string | null): string {
  if (!od) return "";
  const d = (s: string) => {
    const [, m, day] = s.split("-");
    return `${Number(day)}.${Number(m)}.`;
  };
  const year = od.slice(0, 4);
  return doD && doD !== od ? `${d(od)}–${d(doD)}${year}.` : `${d(od)}${year}.`;
}

export async function buildTournamentReport(
  supabase: Db,
  tournamentId: string,
): Promise<{ naslov: string; sadrzaj: string } | null> {
  const { data: tr } = await supabase
    .from("tournaments")
    .select("naziv, serija, mesto, datum_od, datum_do, direktor_ime, domacin, clubs ( naziv, grad )")
    .eq("id", tournamentId)
    .maybeSingle();
  if (!tr) return null;

  const { data: draws } = await supabase
    .from("draws")
    .select(
      `id, tip,
       event:tournament_events!inner ( kategorija, disciplina, turnir_id ),
       matches (
         kolo, pozicija, status, winner_slot,
         p1:players!matches_player1_id_fkey ( ime, prezime ),
         p2:players!matches_player2_id_fkey ( ime, prezime ),
         match_sets ( set_no, gem1, gem2 )
       )`,
    )
    .eq("tournament_events.turnir_id", tournamentId);
  if (!draws || draws.length === 0) return null;

  type M = (typeof draws)[number]["matches"][number];
  // skor uvek iz ugla pobednika (kad je pobedio slot 2, gemovi se obrću)
  const score = (m: M, swap: boolean) => {
    const s = [...m.match_sets]
      .sort((a, b) => a.set_no - b.set_no)
      .map((x) => (swap ? `${x.gem2}:${x.gem1}` : `${x.gem1}:${x.gem2}`))
      .join(" ");
    const suffix = m.status === "walkover" ? " (wo)" : m.status === "predaja" || m.status === "retiranje" ? " (pred.)" : "";
    return (s || "") + suffix;
  };
  const matchLine = (m: M) => {
    const swap = m.winner_slot === 2;
    const w = swap ? [m.p2, m.p1] : [m.p1, m.p2];
    return `${name(w[0])} – ${name(w[1])} ${score(m, swap)}`.trim();
  };
  // round-robin detekcija: igrač se ponavlja u istom kolu
  const isRR = (ms: M[]) => {
    const seen = new Set<string>();
    for (const m of ms) {
      for (const p of [m.p1, m.p2]) {
        if (!p) continue;
        const k = `${p.ime}|${p.prezime}`;
        if (seen.has(k)) return true;
        seen.add(k);
      }
    }
    return false;
  };

  const sorted = [...draws].sort(
    (a, b) =>
      (a.event.disciplina === b.event.disciplina ? 0 : a.event.disciplina < b.event.disciplina ? -1 : 1) ||
      catRank(a.event.kategorija) - catRank(b.event.kategorija),
  );

  const winners: string[] = [];
  const sections: string[] = [];

  for (const d of sorted) {
    const label = `${DISC_LABEL[d.event.disciplina] ?? d.event.disciplina} ${d.event.kategorija}`;
    const resolved = d.matches.filter((m) => m.kolo > 0 && m.winner_slot !== null);
    if (resolved.length === 0) continue;
    const last = Math.max(...resolved.map((m) => m.kolo));
    const lastMatches = d.matches.filter((m) => m.kolo === last);

    if (isRR(lastMatches)) {
      // grupa: plasman po pobedama
      const wins = new Map<string, number>();
      for (const m of lastMatches) {
        for (const p of [m.p1, m.p2]) if (p) wins.set(name(p), wins.get(name(p)) ?? 0);
        const w = m.winner_slot === 1 ? m.p1 : m.winner_slot === 2 ? m.p2 : null;
        if (w) wins.set(name(w), (wins.get(name(w)) ?? 0) + 1);
      }
      const table = [...wins.entries()].sort((a, b) => b[1] - a[1]);
      if (table.length === 0) continue;
      winners.push(`${label}: ${table[0][0]}`);
      sections.push(
        `${label} (grupa):\n` +
          table.map(([n, w], i) => `${i + 1}. ${n} (${w} pob.)`).join("\n"),
      );
    } else {
      const finale = lastMatches.find((m) => m.pozicija === 1 && m.winner_slot !== null);
      if (!finale) continue;
      const champ = finale.winner_slot === 1 ? finale.p1 : finale.p2;
      winners.push(`${label}: ${name(champ)}`);
      const semis = d.matches.filter((m) => m.kolo === last - 1 && m.winner_slot !== null && m.status !== "bye");
      const lines = [`Finale: ${matchLine(finale)}`];
      if (semis.length > 0) {
        lines.push(...semis.map((m) => `Polufinale: ${matchLine(m)}`));
      }
      sections.push(`${label}:\n${lines.join("\n")}`);
    }
  }
  if (winners.length === 0) return null;

  const mesto = tr.mesto ?? tr.clubs?.grad ?? "";
  const kada = tr.datum_od ? ` ${fmtDates(tr.datum_od, tr.datum_do)}` : "";
  const intro = [
    mesto
      ? `U mestu ${mesto}${kada ? `,${kada},` : ""} odigran je ${tr.naziv} (${SERIES_LABEL[tr.serija] ?? tr.serija}).`
      : `${kada ? `${kada.trim()} ` : ""}odigran je ${tr.naziv} (${SERIES_LABEL[tr.serija] ?? tr.serija}).`.replace(/^o/, "O"),
    tr.clubs?.naziv ? `Domaćin: ${tr.clubs.naziv}${tr.domacin ? ` (${tr.domacin})` : ""}.` : tr.domacin ? `Domaćin: ${tr.domacin}.` : "",
    tr.direktor_ime ? `Sudija: ${tr.direktor_ime}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const sadrzaj = [
    intro,
    `🏆 Pobednici:\n${winners.join("\n")}`,
    ...sections,
  ].join("\n\n");

  return { naslov: `Završen ${tr.naziv}`, sadrzaj };
}
