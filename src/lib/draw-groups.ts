import type { DrawMatchRow } from "@/lib/data/draws";

/**
 * Round-robin detekcija: u čistom eliminacionom kolu igrač igra najviše jednom.
 * Ponavljanje igrača u istom skupu mečeva → round-robin grupa. (Uvezeni istorijski
 * „grupa + finale" turniri su RR mečeve stavili u kolo>0 umesto kolo=0 + grupa.)
 */
export function isRoundRobin(matches: DrawMatchRow[]): boolean {
  const seen = new Set<string>();
  for (const m of matches) {
    for (const p of [m.p1, m.p2]) {
      if (!p) continue;
      if (seen.has(p.id)) return true;
      seen.add(p.id);
    }
  }
  return false;
}

export type StandingRow = { name: string; wins: number };

/** Tabela grupe: pobede po igraču, sortirano opadajuće (pobednik prvi). */
export function groupStandings(matches: DrawMatchRow[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  const ensure = (p: NonNullable<DrawMatchRow["p1"]>) => {
    if (!rows.has(p.id)) rows.set(p.id, { name: `${p.ime[0]}. ${p.prezime}`, wins: 0 });
    return rows.get(p.id)!;
  };
  for (const m of matches) {
    if (m.p1) ensure(m.p1);
    if (m.p2) ensure(m.p2);
    const w = m.winner_slot === 1 ? m.p1 : m.winner_slot === 2 ? m.p2 : null;
    if (w) ensure(w).wins += 1;
  }
  return [...rows.values()].sort((a, b) => b.wins - a.wins);
}
