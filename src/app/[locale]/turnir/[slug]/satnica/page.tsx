import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTournamentBySlug } from "@/lib/data/tournaments";
import { getDrawsForTournament } from "@/lib/data/draws";
import { formatDateRange } from "@/lib/format";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const TZ = "Europe/Belgrade";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "draw" });
  const tr = await getTournamentBySlug(slug);
  return { title: `${t("scheduleTitle")} — ${tr?.naziv ?? ""}` };
}

export default async function SatnicaPrintPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("tournament");
  const td = await getTranslations("draw");
  const tr = await getTournamentBySlug(slug);
  if (!tr) notFound();

  const draws = await getDrawsForTournament(tr.id);
  const scheduled = draws
    .flatMap((d) =>
      d.matches
        .filter((m) => m.termin)
        .map((m) => ({
          ...m,
          kategorija: d.event.kategorija,
          disciplina: d.event.disciplina,
        })),
    )
    .sort((a, b) => (a.termin! < b.termin! ? -1 : 1));

  const localeTag = locale === "sr" ? "sr-Latn-RS" : "en-GB";
  const dayFmt = new Intl.DateTimeFormat(localeTag, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  });
  const timeFmt = new Intl.DateTimeFormat(localeTag, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
  const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  });

  // grupiši po beogradskom danu
  const byDay = new Map<string, { label: string; matches: typeof scheduled }>();
  for (const m of scheduled) {
    const d = new Date(m.termin!);
    const key = dayKeyFmt.format(d);
    const g = byDay.get(key) ?? { label: dayFmt.format(d), matches: [] };
    g.matches.push(m);
    byDay.set(key, g);
  }

  const name = (p: { ime: string; prezime: string } | null) =>
    p ? `${p.ime} ${p.prezime}` : "—";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 print:max-w-none print:p-0">
      <div className="mb-5 flex flex-wrap items-center gap-3 print:hidden">
        <Link
          href={`/turnir/${slug}`}
          className="text-sm font-semibold text-muted transition hover:text-navy"
        >
          ← {tr.naziv}
        </Link>
        <div className="ml-auto">
          <PrintButton label={td("printSchedule")} />
        </div>
      </div>

      <header className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-navy print:text-black">
          {td("scheduleTitle")} — {tr.naziv}
        </h1>
        <p className="mt-1 text-sm text-muted print:text-black">
          {formatDateRange(tr.datum_od, tr.datum_do, locale)}
          {tr.mesto ? ` · ${tr.mesto}` : ""}
          {tr.lokacija ? ` · ${tr.lokacija}` : ""}
        </p>
      </header>

      {scheduled.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line2 bg-card p-6 text-sm text-muted">
          {td("scheduleEmpty")}
        </p>
      ) : (
        [...byDay.values()].map((g) => (
          <section key={g.label} className="mb-6 break-inside-avoid">
            <h2 className="mb-2 border-b-2 border-navy pb-1 font-display text-base font-bold uppercase tracking-wide text-navy print:text-black">
              {g.label}
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted print:text-black">
                  <th className="border-b border-line py-1.5 pr-3">{td("time")}</th>
                  <th className="border-b border-line py-1.5 pr-3">{td("court")}</th>
                  <th className="border-b border-line py-1.5 pr-3">{td("match")}</th>
                  <th className="border-b border-line py-1.5">{td("event")}</th>
                </tr>
              </thead>
              <tbody>
                {g.matches.map((m) => (
                  <tr key={m.id} className="align-top">
                    <td className="border-b border-line py-2 pr-3 font-mono font-semibold">
                      {timeFmt.format(new Date(m.termin!))}
                    </td>
                    <td className="border-b border-line py-2 pr-3">{m.teren ?? "—"}</td>
                    <td className="border-b border-line py-2 pr-3">
                      {name(m.p1)} — {name(m.p2)}
                    </td>
                    <td className="border-b border-line py-2 text-xs">
                      {t(`discipline.${m.disciplina}`)} · {m.kategorija}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
    </div>
  );
}
