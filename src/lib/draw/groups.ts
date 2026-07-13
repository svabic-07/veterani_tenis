import type { DrawEntry, DrawMatch, GeneratedDraw, GroupStanding } from "./types";
import { createRng, shuffle } from "./rng";
import { seedingOrder } from "./knockout";

/**
 * Round-robin žrebovi (TVS pravila):
 * - 3–4 učesnika: jedna grupa, svako sa svakim, bez nosilaca
 * - 5 učesnika („grupa od 5"): N1 i N2 direktno u polufinale;
 *   rang 3–4–5 igraju grupu (3 meča) → 2. iz grupe vs N1, 1. iz grupe vs N2
 * - 6–7 učesnika: 2 grupe (N1 → A, N2 → B, ostali žrebom) →
 *   ukrštena polufinala A1–B2 i B1–A2, pa finale
 */

/** Svako sa svakim — parovi mečeva za grupu (kolo = 0). */
function roundRobinMatches(
  group: readonly DrawEntry[],
  groupLabel: string,
  startPosition: number,
): DrawMatch[] {
  const matches: DrawMatch[] = [];
  let position = startPosition;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      matches.push({
        round: 0,
        position: position++,
        group: groupLabel,
        p1: group[i],
        p2: group[j],
        status: "zakazan",
      });
    }
  }
  return matches;
}

export function generateSingleGroup(entries: readonly DrawEntry[], rngSeed: string): GeneratedDraw {
  if (entries.length < 3 || entries.length > 4) {
    throw new Error("jedna grupa je za 3–4 učesnika");
  }
  const order = shuffle(entries, createRng(rngSeed));
  return {
    tip: "grupa",
    kostur: null,
    brojNosilaca: 0,
    seeds: [],
    matches: roundRobinMatches(order, "A", 1),
  };
}

export function generateGrupa5(entries: readonly DrawEntry[], rngSeed: string): GeneratedDraw {
  if (entries.length !== 5) throw new Error("grupa od 5 zahteva tačno 5 učesnika");
  const rng = createRng(rngSeed);
  const ordered = seedingOrder(entries);
  const [n1, n2, ...grupa] = ordered;

  const matches: DrawMatch[] = roundRobinMatches(shuffle(grupa, rng), "G", 1);
  // PF: 2. iz grupe vs N1, 1. iz grupe vs N2 (protivnici iz grupe se popune po plasmanu)
  matches.push(
    {
      round: 1,
      position: 1,
      p1: n1,
      seed1: 1,
      p2: null,
      status: "zakazan",
      next: { round: 2, position: 1, slot: 1 },
    },
    {
      round: 1,
      position: 2,
      p1: n2,
      seed1: 2,
      p2: null,
      status: "zakazan",
      next: { round: 2, position: 1, slot: 2 },
    },
    { round: 2, position: 1, p1: null, p2: null, status: "zakazan" },
  );
  return { tip: "grupa5", kostur: null, brojNosilaca: 2, seeds: [n1, n2], matches };
}

export function generateTwoGroups(entries: readonly DrawEntry[], rngSeed: string): GeneratedDraw {
  if (entries.length < 6 || entries.length > 7) {
    throw new Error("dve grupe su za 6–7 učesnika");
  }
  const rng = createRng(rngSeed);
  const ordered = seedingOrder(entries);
  const [n1, n2, ...rest] = ordered;
  const shuffled = shuffle(rest, rng);
  const a: DrawEntry[] = [n1];
  const b: DrawEntry[] = [n2];
  // grupa A dobija višak kod 7 učesnika (4 + 3)
  shuffled.forEach((e, i) => (i % 2 === 0 ? a : b).push(e));

  const groupA = roundRobinMatches(a, "A", 1);
  const groupB = roundRobinMatches(b, "B", groupA.length + 1);
  const matches: DrawMatch[] = [...groupA, ...groupB];
  // ukrštena PF: A1 vs B2, B1 vs A2 (popunjavaju se po plasmanu)
  matches.push(
    {
      round: 1,
      position: 1,
      p1: null,
      p2: null,
      status: "zakazan",
      next: { round: 2, position: 1, slot: 1 },
    },
    {
      round: 1,
      position: 2,
      p1: null,
      p2: null,
      status: "zakazan",
      next: { round: 2, position: 1, slot: 2 },
    },
    { round: 2, position: 1, p1: null, p2: null, status: "zakazan" },
  );
  return { tip: "grupa", kostur: null, brojNosilaca: 2, seeds: [n1, n2], matches };
}

/**
 * Plasman u grupi: pobede → međusobni skor (2 izjednačena) → količnik
 * setova → količnik gemova. Računa samo završene mečeve zadate grupe.
 */
export function computeGroupStandings(
  matches: readonly DrawMatch[],
  groupLabel: string,
): GroupStanding[] {
  const table = new Map<string, GroupStanding>();
  const ensure = (e: DrawEntry) => {
    let s = table.get(e.id);
    if (!s) {
      s = { entry: e, played: 0, wins: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0 };
      table.set(e.id, s);
    }
    return s;
  };

  const groupMatches = matches.filter((m) => m.round === 0 && m.group === groupLabel);
  for (const m of groupMatches) {
    if (m.p1) ensure(m.p1);
    if (m.p2) ensure(m.p2);
    if (!m.winnerSlot || !m.p1 || !m.p2) continue;
    const s1 = ensure(m.p1);
    const s2 = ensure(m.p2);
    s1.played++;
    s2.played++;
    (m.winnerSlot === 1 ? s1 : s2).wins++;
    for (const set of m.sets ?? []) {
      s1.gamesWon += set.g1;
      s1.gamesLost += set.g2;
      s2.gamesWon += set.g2;
      s2.gamesLost += set.g1;
      if (set.g1 > set.g2) {
        s1.setsWon++;
        s2.setsLost++;
      } else if (set.g2 > set.g1) {
        s2.setsWon++;
        s1.setsLost++;
      }
    }
  }

  const ratio = (won: number, lost: number) => (lost === 0 ? Infinity : won / lost);
  const standings = [...table.values()].sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    const setR = ratio(y.setsWon, y.setsLost) - ratio(x.setsWon, x.setsLost);
    if (setR !== 0) return setR;
    return ratio(y.gamesWon, y.gamesLost) - ratio(x.gamesWon, x.gamesLost);
  });

  // međusobni skor kad su tačno dvojica izjednačena po pobedama
  for (let i = 0; i < standings.length - 1; i++) {
    const x = standings[i];
    const y = standings[i + 1];
    const tiedCount = standings.filter((s) => s.wins === x.wins).length;
    if (x.wins === y.wins && tiedCount === 2) {
      const h2h = groupMatches.find(
        (m) =>
          m.winnerSlot &&
          ((m.p1?.id === x.entry.id && m.p2?.id === y.entry.id) ||
            (m.p1?.id === y.entry.id && m.p2?.id === x.entry.id)),
      );
      if (h2h?.winnerSlot) {
        const winnerId = h2h.winnerSlot === 1 ? h2h.p1!.id : h2h.p2!.id;
        if (winnerId === y.entry.id) {
          standings[i] = y;
          standings[i + 1] = x;
        }
      }
    }
  }
  return standings;
}

/** Da li su svi mečevi grupe završeni. */
export function isGroupComplete(matches: readonly DrawMatch[], groupLabel: string): boolean {
  return matches
    .filter((m) => m.round === 0 && m.group === groupLabel)
    .every((m) => m.winnerSlot !== undefined);
}

/**
 * Po završetku grupa popunjava polufinala:
 * - grupa5: PF1.p2 = 2. iz grupe G, PF2.p2 = 1. iz grupe G
 * - dve grupe: PF1 = A1 vs B2, PF2 = B1 vs A2
 * Vraća izmenjene mečeve (ulaz ne menja).
 */
export function resolveGroupsIntoSemis(draw: GeneratedDraw): GeneratedDraw {
  const matches = draw.matches.map((m) => ({ ...m }));
  const sf1 = matches.find((m) => m.round === 1 && m.position === 1);
  const sf2 = matches.find((m) => m.round === 1 && m.position === 2);
  if (!sf1 || !sf2) return { ...draw, matches };

  if (draw.tip === "grupa5") {
    if (!isGroupComplete(matches, "G")) return { ...draw, matches };
    const st = computeGroupStandings(matches, "G");
    sf1.p2 = st[1]?.entry ?? null; // N1 vs 2. iz grupe
    sf2.p2 = st[0]?.entry ?? null; // N2 vs 1. iz grupe
  } else {
    if (!isGroupComplete(matches, "A") || !isGroupComplete(matches, "B")) {
      return { ...draw, matches };
    }
    const a = computeGroupStandings(matches, "A");
    const b = computeGroupStandings(matches, "B");
    sf1.p1 = a[0]?.entry ?? null; // A1 vs B2
    sf1.p2 = b[1]?.entry ?? null;
    sf2.p1 = b[0]?.entry ?? null; // B1 vs A2
    sf2.p2 = a[1]?.entry ?? null;
  }
  return { ...draw, matches };
}
