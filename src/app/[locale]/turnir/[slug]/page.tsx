import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTournamentBySlug } from "@/lib/data/tournaments";
import { formatDateRange, formatDeadline } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tr = await getTournamentBySlug(slug);
  return { title: tr?.naziv ?? "Turnir" };
}

const STATUS_STYLE: Record<string, string> = {
  najava: "bg-white/15 border border-white/25 text-white",
  prijave: "bg-ball text-navy",
  zreb: "bg-white/15 text-white",
  u_toku: "bg-clay text-white",
  zavrsen: "bg-white/10 text-white/70",
  ponovo_otvoren: "bg-info text-white",
};

const DISCIPLINE_ORDER = ["singl", "dubl", "miks"] as const;

export default async function TurnirPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("tournament");
  const tc = await getTranslations("calendar");
  const tr = await getTournamentBySlug(slug);
  if (!tr) notFound();

  const club = tr.clubs;
  const dir = tr.direktor;

  // Grupiši konkurencije po disciplini
  const byDiscipline = DISCIPLINE_ORDER.map((disc) => ({
    disc,
    kategorije: tr.tournament_events
      .filter((e) => e.disciplina === disc)
      .map((e) => e.kategorija),
  })).filter((g) => g.kategorije.length > 0);

  const info: { label: string; value: string }[] = [
    { label: t("series"), value: tc(`series.${tr.serija}`) },
    { label: t("system"), value: tc(`system.${tr.sistem}`) },
    { label: t("dates"), value: formatDateRange(tr.datum_od, tr.datum_do, locale) },
    ...(club ? [{ label: t("host"), value: `${club.naziv}${club.grad ? ` · ${club.grad}` : ""}` }] : []),
    ...(dir ? [{ label: t("director"), value: `${dir.ime} ${dir.prezime}` }] : []),
    ...(tr.rok_prijave ? [{ label: t("deadline"), value: formatDeadline(tr.rok_prijave, locale) }] : []),
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden text-white">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 320px at 90% -20%, rgba(214,232,75,.18), transparent 60%)," +
              "linear-gradient(135deg,#16263E 0%, #13314A 55%, #1C5340 100%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <Link href="/kalendar" className="text-sm font-semibold text-white/70 transition hover:text-white">
            {t("backToCalendar")}
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-clay px-3 py-1 text-xs font-bold text-white">
              {tc(`series.${tr.serija}`)}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                STATUS_STYLE[tr.status] ?? STATUS_STYLE.najava
              }`}
            >
              {tc(`status.${tr.status}`)}
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {tr.naziv}
          </h1>
          <p className="mt-2 text-white/70">
            {formatDateRange(tr.datum_od, tr.datum_do, locale)}
            {club ? ` · ${club.naziv}, ${club.grad ?? ""}` : ""}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Tabovi (placeholder do Faze 3) */}
        <div className="mb-6 flex flex-wrap gap-2">
          {(["draw", "schedule", "entries", "results"] as const).map((tab, i) => (
            <span
              key={tab}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                i === 0
                  ? "border-clay bg-clay text-white"
                  : "border-line2 bg-card text-muted"
              }`}
            >
              {t(`tabs.${tab}`)}
            </span>
          ))}
        </div>

        <div className="rounded-2xl border border-dashed border-line2 bg-card p-6 text-sm text-slate">
          {t("soon")}
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_1.4fr]">
          {/* Info */}
          <section>
            <h2 className="mb-3 font-display text-lg font-bold text-navy">{t("info")}</h2>
            <dl className="overflow-hidden rounded-2xl border border-line bg-card">
              {info.map((row, i) => (
                <div
                  key={row.label}
                  className={`flex justify-between gap-4 px-4 py-3 text-sm ${
                    i % 2 ? "bg-[#FBF8F3]" : ""
                  }`}
                >
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="text-right font-medium text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Konkurencije */}
          <section>
            <h2 className="font-display text-lg font-bold text-navy">{t("events")}</h2>
            <p className="mb-3 text-sm text-slate">{t("eventsSub")}</p>
            {byDiscipline.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line2 bg-card p-5 text-sm text-muted">
                {t("noEvents")}
              </p>
            ) : (
              <div className="space-y-3">
                {byDiscipline.map((g) => (
                  <div key={g.disc} className="rounded-2xl border border-line bg-card p-4">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-court-dark">
                      {t(`discipline.${g.disc}`)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {g.kategorije.map((k) => (
                        <span
                          key={k}
                          className="inline-flex items-center rounded-lg border border-line2 bg-bg2 px-2.5 py-1 font-mono text-xs text-slate"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
