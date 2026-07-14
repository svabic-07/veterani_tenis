/** Formatiranje datuma/vremena za SR/EN prikaz. */

function localeTag(locale: string): string {
  return locale === "sr" ? "sr-Latn-RS" : "en-GB";
}

/** "11–12. jul 2026." (isti mesec) ili "29. avg – 27. sep 2026." */
export function formatDateRange(
  od: string | null,
  doo: string | null,
  locale: string,
): string {
  if (!od) return "";
  const tag = localeTag(locale);
  const start = new Date(`${od}T00:00:00`);
  const end = doo ? new Date(`${doo}T00:00:00`) : null;

  const full = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric" });
  const day = new Intl.DateTimeFormat(tag, { day: "numeric" });
  const dayMonth = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short" });

  if (!end || od === doo) return full.format(start);

  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth
    ? `${day.format(start)}–${full.format(end)}`
    : `${dayMonth.format(start)} – ${full.format(end)}`;
}

/** Datum turnira u dva dela za karticu: { big: "18–19", small: "JUL 2026" }. */
export function formatDateParts(
  od: string | null,
  doo: string | null,
  locale: string,
): { big: string; small: string } {
  if (!od) return { big: "", small: "" };
  const tag = localeTag(locale);
  const start = new Date(`${od}T00:00:00`);
  const end = doo ? new Date(`${doo}T00:00:00`) : null;
  const day = (d: Date) => new Intl.DateTimeFormat(tag, { day: "numeric" }).format(d);
  const mon = new Intl.DateTimeFormat(tag, { month: "short" }).format(start).replace(".", "");
  const year = start.getFullYear();
  const sameDay = !end || od === doo;
  const sameMonth =
    end?.getMonth() === start.getMonth() && end?.getFullYear() === start.getFullYear();
  let big: string;
  if (sameDay) big = day(start);
  else if (sameMonth) big = `${day(start)}–${day(end!)}`;
  else big = `${day(start)}.–${day(end!)}.`;
  return { big, small: `${mon.toUpperCase()} ${year}` };
}

/** "čet 16.07. 20:00" — rok prijave. */
export function formatDeadline(ts: string | null, locale: string): string {
  if (!ts) return "";
  const tag = localeTag(locale);
  return new Intl.DateTimeFormat(tag, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Belgrade",
  }).format(new Date(ts));
}

const TZ = "Europe/Belgrade";

/** "sub 18.07. 09:00" — termin meča (satnica). */
export function formatMatchTime(ts: string | null, locale: string): string {
  if (!ts) return "";
  return new Intl.DateTimeFormat(localeTag(locale), {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(ts));
}

/** datetime-local vrednost ("2026-07-18T09:00") iz ISO — po beogradskom zidnom satu. */
export function isoToBelgradeInput(iso: string | null): string {
  if (!iso) return "";
  const s = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return s.replace(" ", "T");
}

/** Beogradsko zidno vreme ("2026-07-18T09:00") → tačan UTC trenutak (ISO). */
export function belgradeInputToIso(local: string): string {
  const guess = new Date(`${local}:00Z`);
  const wall = new Date(
    guess.toLocaleString("en-US", { timeZone: TZ, hour12: false }),
  );
  const utcView = new Date(guess.toLocaleString("en-US", { timeZone: "UTC", hour12: false }));
  const offsetMs = wall.getTime() - utcView.getTime();
  return new Date(guess.getTime() - offsetMs).toISOString();
}
