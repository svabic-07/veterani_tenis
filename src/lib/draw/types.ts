/** Učesnik žreba (igrač ili par). `points` = bodovi za nošenje (null = nerangiran). */
export type DrawEntry = {
  id: string;
  partnerId?: string | null;
  points: number | null;
  clubId?: string | null;
};

/** Rezultat meča po setovima (za obračun plasmana u grupi). */
export type SetScore = { g1: number; g2: number };

/** Meč u generisanom žrebu. `round` 0 = grupa (RR), 1..N = eliminaciona kola. */
export type DrawMatch = {
  round: number;
  position: number;
  group?: string;
  p1: DrawEntry | null;
  p2: DrawEntry | null;
  seed1?: number;
  seed2?: number;
  status: "zakazan" | "bye" | "zavrsen" | "walkover" | "predaja" | "retiranje";
  winnerSlot?: 1 | 2;
  /** Gde ide pobednik. */
  next?: { round: number; position: number; slot: 1 | 2 };
  sets?: SetScore[];
};

export type DrawType = "eliminacija" | "grupa" | "grupa5";

export type GeneratedDraw = {
  tip: DrawType;
  /** 8/16/32/64/128 za eliminaciju; null za grupe. */
  kostur: number | null;
  brojNosilaca: number;
  /** Nosioci redom (index 0 = N1) — snapshot izvora nošenja. */
  seeds: DrawEntry[];
  matches: DrawMatch[];
};

/** Plasman u grupi. */
export type GroupStanding = {
  entry: DrawEntry;
  played: number;
  wins: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
};
