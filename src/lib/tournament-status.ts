/**
 * Status turnira izveden iz datuma.
 *
 * Uvezena istorija ima sve turnire označene kao `zavrsen` bez obzira na datum,
 * pa se pravi status (za particiju predstojeći/odigrani i za Pill oznaku) računa
 * iz datuma, a ne iz kolone `status`.
 */
export type DateStatusKey = "najava" | "u_toku" | "zavrsen";

/** Današnji datum u ISO obliku (YYYY-MM-DD), za poređenje sa datumima turnira. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Poslednji dan turnira (datum_do ako postoji, inače datum_od). */
export function endOfTournament(datum_od: string | null, datum_do: string | null): string {
  return datum_do ?? datum_od ?? "";
}

/** Da li se turnir još nije završio (traje ili je u budućnosti). */
export function isUpcoming(
  datum_od: string | null,
  datum_do: string | null,
  today: string = todayISO(),
): boolean {
  const end = endOfTournament(datum_od, datum_do);
  return end !== "" && end >= today;
}

/** Status iz datuma: prošao → zavrsen, traje → u_toku, u budućnosti → najava. */
export function statusByDate(
  datum_od: string | null,
  datum_do: string | null,
  today: string = todayISO(),
): DateStatusKey {
  const start = datum_od ?? "";
  const end = endOfTournament(datum_od, datum_do);
  if (end !== "" && end < today) return "zavrsen";
  if (start !== "" && start <= today && end >= today) return "u_toku";
  return "najava";
}
