import type { GeneratedDraw } from "./types";

export type FinishStatus = "zavrsen" | "walkover" | "predaja" | "retiranje";

/**
 * Upis pobednika + auto-napredovanje u sledeće kolo.
 * Vraća nove mečeve (ulaz ne menja). Baca grešku ako meč nije kompletan
 * ili je već rešen (korekcije rešava koordinator — Faza 4).
 */
export function advanceWinner(
  draw: GeneratedDraw,
  round: number,
  position: number,
  winnerSlot: 1 | 2,
  opts?: { status?: FinishStatus; sets?: { g1: number; g2: number }[] },
): GeneratedDraw {
  const matches = draw.matches.map((m) => ({ ...m }));
  const match = matches.find((m) => m.round === round && m.position === position);
  if (!match) throw new Error(`meč ${round}:${position} ne postoji`);
  if (match.winnerSlot !== undefined) throw new Error("meč je već rešen");
  if (!match.p1 || !match.p2) throw new Error("meč još nema oba učesnika");

  match.winnerSlot = winnerSlot;
  match.status = opts?.status ?? "zavrsen";
  if (opts?.sets) match.sets = opts.sets;

  if (match.next) {
    const next = matches.find(
      (m) => m.round === match.next!.round && m.position === match.next!.position,
    );
    if (next) {
      const winner = winnerSlot === 1 ? match.p1 : match.p2;
      const seed = winnerSlot === 1 ? match.seed1 : match.seed2;
      if (match.next.slot === 1) {
        next.p1 = winner;
        next.seed1 = seed;
      } else {
        next.p2 = winner;
        next.seed2 = seed;
      }
    }
  }
  return { ...draw, matches };
}
