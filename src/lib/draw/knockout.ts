import type { DrawEntry, DrawMatch, GeneratedDraw } from "./types";
import { createRng, shuffle, type Rng } from "./rng";

/**
 * Eliminacioni žreb po ITF pravilu (Reg. 35–38, prilagođeno TVS-u):
 * - kostur 8/16/32/64/128 (najmanji koji prima sve prijavljene)
 * - broj nosilaca po kosturu: 2/4/8/16/32 (nerangirani se ne nose)
 * - N1 → linija 1, N2 → dno; N3–4 žrebom u četvrtine; N5–8 u osmine…
 * - bye nosiocima po opadajućem redu, ostatak žrebom (nikad bye vs bye)
 * - razdvajanje kluba: meko (best-effort) za nosioce i 1. kolo
 */

const SEED_ANCHORS: Record<number, number[][]> = {
  8: [[1], [8]],
  16: [[1], [16], [5, 12]],
  32: [[1], [32], [9, 24], [8, 16, 17, 25]],
  64: [
    [1],
    [64],
    [17, 48],
    [16, 32, 33, 49],
    [8, 9, 24, 25, 40, 41, 56, 57],
  ],
  128: [
    [1],
    [128],
    [33, 96],
    [32, 64, 65, 97],
    [16, 17, 48, 49, 80, 81, 112, 113],
    [8, 9, 24, 25, 40, 41, 56, 57, 72, 73, 88, 89, 104, 105, 120, 121],
  ],
};

const SEED_COUNT: Record<number, number> = { 8: 2, 16: 4, 32: 8, 64: 16, 128: 32 };

/**
 * Kostur po TVS tabeli (bodovi zavise od kostura, pa su rasponi fiksni):
 * do 10 → 8 · 11–20 → 16 · 21–40 → 32 · 41–80 → 64 · 81–128 → 128.
 * Višak preko kostura (npr. 9–10 u kosturu 8) igra predkolo.
 */
export function bracketSize(n: number): number {
  if (n <= 10) return 8;
  if (n <= 20) return 16;
  if (n <= 40) return 32;
  if (n <= 80) return 64;
  if (n <= 128) return 128;
  throw new Error(`previše prijavljenih za eliminacioni žreb: ${n}`);
}

/** Sortiranje za nošenje: bodovi opadajuće, nerangirani (null) na kraju. */
export function seedingOrder(entries: readonly DrawEntry[]): DrawEntry[] {
  return [...entries].sort((a, b) => (b.points ?? -1) - (a.points ?? -1));
}

/** Broj nosilaca: uvek po tabeli kostura (8→2, 16→4, 32→8…) — TVS pravilo.
 *  Redosled: ručne oznake/bodovi (seedingOrder); i bez bodova mesta se popune. */
export function seedCount(kostur: number, entries: readonly DrawEntry[]): number {
  return Math.min(SEED_COUNT[kostur] ?? 0, entries.length);
}

type Line = { entry: DrawEntry | null; seed?: number; bye?: boolean; prelim?: number };

/** Polovina (0/1) linije u kosturu. */
const half = (line: number, kostur: number) => (line <= kostur / 2 ? 0 : 1);
/** Četvrtina (0–3) linije u kosturu. */
const quarter = (line: number, kostur: number) => Math.floor(((line - 1) * 4) / kostur);

/**
 * Dodela nosilaca grupe na anchor pozicije — nasumično, ali sa mekim
 * razdvajanjem kluba od jačih nosilaca (N3–4: druga polovina od N1/N2
 * istog kluba; N5–8: druga četvrtina), biranjem najbolje od više permutacija.
 */
function assignSeedGroup(
  lines: Line[],
  kostur: number,
  groupSeeds: { seed: number; entry: DrawEntry }[],
  anchors: number[],
  rng: Rng,
): void {
  const placed = lines
    .map((l, i) => ({ line: i + 1, l }))
    .filter(({ l }) => l.seed !== undefined);

  const conflictScore = (assignment: { seed: number; entry: DrawEntry; line: number }[]) => {
    let score = 0;
    for (const a of assignment) {
      if (!a.entry.clubId) continue;
      for (const p of placed) {
        if (p.l.entry?.clubId !== a.entry.clubId) continue;
        if (half(a.line, kostur) === half(p.line, kostur)) score += 2;
        if (quarter(a.line, kostur) === quarter(p.line, kostur)) score += 3;
      }
    }
    return score;
  };

  let best: { seed: number; entry: DrawEntry; line: number }[] | null = null;
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 8 && bestScore > 0; attempt++) {
    const shuffled = shuffle(anchors, rng);
    const candidate = groupSeeds.map((gs, i) => ({ ...gs, line: shuffled[i] }));
    const score = conflictScore(candidate);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  for (const a of best!) {
    lines[a.line - 1] = { entry: a.entry, seed: a.seed };
  }
}

/** Broj parova istog kluba u 1. kolu (za meko razdvajanje nerangiranih). */
function sameClubPairs(lines: readonly Line[]): number {
  let count = 0;
  for (let i = 0; i < lines.length; i += 2) {
    const a = lines[i].entry?.clubId;
    const b = lines[i + 1].entry?.clubId;
    if (a && b && a === b) count++;
  }
  return count;
}

export function generateKnockout(entries: readonly DrawEntry[], rngSeed: string): GeneratedDraw {
  if (entries.length < 2) throw new Error("žreb zahteva bar 2 učesnika");
  const rng = createRng(rngSeed);
  const kostur = bracketSize(entries.length);
  const ordered = seedingOrder(entries);
  const nSeeds = seedCount(kostur, ordered);

  // višak preko kostura → predkolo (2×extra najslabijih igra za extra linija)
  const extra = Math.max(0, entries.length - kostur);
  const prelimPlayers = extra > 0 ? ordered.slice(ordered.length - 2 * extra) : [];
  const mainOrdered = extra > 0 ? ordered.slice(0, ordered.length - 2 * extra) : ordered;
  const seeds = mainOrdered.slice(0, nSeeds);
  const rest: (DrawEntry | { prelim: number })[] = [
    ...mainOrdered.slice(nSeeds),
    ...Array.from({ length: extra }, (_, i) => ({ prelim: i })),
  ];

  const lines: Line[] = Array.from({ length: kostur }, () => ({ entry: null }));

  // 1) nosioci na anchor pozicije (grupe: [1], [2], [3–4], [5–8], …)
  const anchorGroups = SEED_ANCHORS[kostur];
  let seedNo = 1;
  for (const anchors of anchorGroups) {
    if (seedNo > nSeeds) break;
    const group = [];
    for (let k = 0; k < anchors.length && seedNo <= nSeeds; k++) {
      group.push({ seed: seedNo, entry: seeds[seedNo - 1] });
      seedNo++;
    }
    assignSeedGroup(lines, kostur, group, anchors, rng);
  }

  // 2) bye-ovi: nosiocima po opadajućem redu, ostatak žrebom (nikad bye vs bye)
  let byes = kostur - entries.length;
  const opponentLine = (line: number) => (line % 2 === 1 ? line + 1 : line - 1);
  for (let s = 1; s <= nSeeds && byes > 0; s++) {
    const seedLine = lines.findIndex((l) => l.seed === s) + 1;
    const opp = opponentLine(seedLine);
    if (!lines[opp - 1].entry && !lines[opp - 1].bye) {
      lines[opp - 1] = { entry: null, bye: true };
      byes--;
    }
  }
  if (byes > 0) {
    const freeLines = shuffle(
      lines.map((l, i) => ({ l, line: i + 1 })).filter(({ l }) => !l.entry && !l.bye),
      rng,
    );
    for (const { line } of freeLines) {
      if (byes === 0) break;
      const opp = lines[opponentLine(line) - 1];
      if (opp.bye) continue; // nikad bye vs bye
      lines[line - 1] = { entry: null, bye: true };
      byes--;
    }
    if (byes > 0) {
      // n ≤ kostur/2 se ne dešava za n ≥ 5 (kostur je najmanji koji prima n);
      // manje od toga ide u grupe, ne u eliminaciju.
      throw new Error("premalo učesnika za eliminacioni kostur — koristi grupu");
    }
  }

  // 3) ostali (i mesta za pobednike predkola) žrebom,
  //    meko izbegavanje klupskih parova u 1. kolu
  const toLine = (item: DrawEntry | { prelim: number } | undefined): Line => {
    if (item === undefined) return { entry: null };
    if ("prelim" in item) return { entry: null, prelim: item.prelim };
    return { entry: item };
  };
  const freeIdx = lines.map((l, i) => i).filter((i) => !lines[i].entry && !lines[i].bye);
  let bestFill = shuffle(rest, rng);
  let bestConflicts = Infinity;
  for (let attempt = 0; attempt < 20 && bestConflicts > 0; attempt++) {
    const fill = attempt === 0 ? bestFill : shuffle(rest, rng);
    const trial = lines.map((l) => ({ ...l }));
    freeIdx.forEach((idx, i) => {
      trial[idx] = toLine(fill[i]);
    });
    const conflicts = sameClubPairs(trial);
    if (conflicts < bestConflicts) {
      bestConflicts = conflicts;
      bestFill = fill;
    }
  }
  freeIdx.forEach((idx, i) => {
    lines[idx] = toLine(bestFill[i]);
  });

  // 4) mečevi: 1. kolo iz linija, ostala kola prazna; bye auto-napreduje
  const rounds = Math.log2(kostur);
  const matches: DrawMatch[] = [];
  for (let r = 1; r <= rounds; r++) {
    const inRound = kostur / 2 ** r;
    for (let p = 1; p <= inRound; p++) {
      matches.push({
        round: r,
        position: p,
        p1: null,
        p2: null,
        status: "zakazan",
        next:
          r < rounds
            ? { round: r + 1, position: Math.ceil(p / 2), slot: p % 2 === 1 ? 1 : 2 }
            : undefined,
      });
    }
  }
  const byKey = new Map(matches.map((m) => [`${m.round}:${m.position}`, m]));
  for (let p = 1; p <= kostur / 2; p++) {
    const m = byKey.get(`1:${p}`)!;
    const a = lines[2 * p - 2];
    const b = lines[2 * p - 1];
    m.p1 = a.entry;
    m.p2 = b.entry;
    m.seed1 = a.seed;
    m.seed2 = b.seed;
    if (a.bye || b.bye) {
      m.status = "bye";
      m.winnerSlot = a.bye ? 2 : 1;
      const winner = a.bye ? b : a;
      const next = byKey.get(`${m.next!.round}:${m.next!.position}`)!;
      if (m.next!.slot === 1) {
        next.p1 = winner.entry;
        next.seed1 = winner.seed;
      } else {
        next.p2 = winner.entry;
        next.seed2 = winner.seed;
      }
    }
  }

  // 5) predkolo (kolo 0): parovi najslabijih; pobednik ide na svoju liniju 1. kola
  if (extra > 0) {
    const pairs = shuffle(prelimPlayers, rng);
    for (let i = 0; i < extra; i++) {
      const line = lines.findIndex((l) => l.prelim === i) + 1;
      matches.push({
        round: 0,
        position: i + 1,
        p1: pairs[2 * i],
        p2: pairs[2 * i + 1],
        status: "zakazan",
        next: { round: 1, position: Math.ceil(line / 2), slot: line % 2 === 1 ? 1 : 2 },
      });
    }
  }

  return { tip: "eliminacija", kostur, brojNosilaca: nSeeds, seeds, matches };
}
