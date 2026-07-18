import type { DrawEntry, GeneratedDraw } from "./types";
import { generateKnockout } from "./knockout";
import { generateSingleGroup, generateGrupa5, generateTwoGroups } from "./groups";

export type { DrawEntry, DrawMatch, DrawType, GeneratedDraw, GroupStanding, SetScore } from "./types";
export { createRng, shuffle } from "./rng";
export { bracketSize, seedCount, seedingOrder, generateKnockout } from "./knockout";
export {
  generateSingleGroup,
  generateGrupa5,
  generateTwoGroups,
  computeGroupStandings,
  isGroupComplete,
  resolveGroupsIntoSemis,
} from "./groups";
export { advanceWinner } from "./progress";

/**
 * Glavni ulaz: bira format po broju učesnika (TVS pravila).
 * 3–4 → jedna grupa · 5 → „grupa od 5" · 6–7 → dve grupe · 8+ → eliminacija.
 * `forceRoundRobin` (sudija štiklira „svak sa svakim"): jedna grupa do 8
 * učesnika bez obzira na automatska pravila.
 */
export function generateDraw(
  entries: readonly DrawEntry[],
  rngSeed: string,
  opts?: { forceRoundRobin?: boolean },
): GeneratedDraw {
  const n = entries.length;
  if (n < 3) throw new Error("žreb zahteva bar 3 učesnika");
  if (opts?.forceRoundRobin) return generateSingleGroup(entries, rngSeed);
  if (n <= 4) return generateSingleGroup(entries, rngSeed);
  if (n === 5) return generateGrupa5(entries, rngSeed);
  if (n <= 7) return generateTwoGroups(entries, rngSeed);
  return generateKnockout(entries, rngSeed);
}
