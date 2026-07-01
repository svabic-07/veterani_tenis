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
  }).format(new Date(ts));
}
