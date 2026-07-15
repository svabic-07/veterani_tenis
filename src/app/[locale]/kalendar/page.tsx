import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTournaments, getWinnersForTournaments } from "@/lib/data/tournaments";
import { formatDateParts, formatDeadline } from "@/lib/format";
import { statusByDate } from "@/lib/tournament-status";
import { PageHero } from "@/components/ui/page-hero";
import { TournamentCard, type Champion } from "@/components/ui/tournament-card";
import { TOURNAMENT_STATUS_TONE } from "@/components/ui/pill";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "calendar" });
  return { title: t("title") };
}

const DISC_SHORT: Record<string, string> = { singl: "", dubl: "/D", miks: "/X" };

export default async function KalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const t = await getTranslations("calendar");
  const all = await getTournaments();

  const today = new Date().toISOString().slice(0, 10);
  const endOf = (tr: (typeof all)[number]) => tr.datum_do ?? tr.datum_od ?? "";
  // Particija STROGO po datumu (uvezeni podaci su svi `zavrsen`):
  //   predstojeći = datum se još nije završio (svi, ne samo 3) → nude prijavu;
  //   arhiva = samo turniri čiji je datum prošao.
  const upcoming = all
    .filter((tr) => endOf(tr) >= today)
    .sort((a, b) => (a.datum_od ?? "").localeCompare(b.datum_od ?? ""));
  const archive = all
    .filter((tr) => endOf(tr) !== "" && endOf(tr) < today)
    .sort((a, b) => (b.datum_od ?? "").localeCompare(a.datum_od ?? ""));

  const years = [...new Set(archive.map((tr) => (tr.datum_od ?? "").slice(0, 4)).filter(Boolean))];
  const selectedYear =
    typeof sp.god === "string" && years.includes(sp.god) ? sp.god : years[0] ?? "";
  const archiveYear = archive.filter((tr) => (tr.datum_od ?? "").startsWith(selectedYear));
  const winners = await getWinnersForTournaments(archiveYear.map((tr) => tr.id));

  const hostLine = (tr: (typeof all)[number]) =>
    [tr.clubs?.naziv, tr.clubs?.grad].filter(Boolean).join(" · ");
  const champs = (id: string): Champion[] =>
    (winners.get(id) ?? []).slice(0, 8).map((w) => ({
      cat: `${w.kategorija}${DISC_SHORT[w.disciplina] ?? ""}`,
      name: `${w.ime[0]}. ${w.prezime}`,
    }));

  return (
    <>
      <PageHero
        compact
        crumb="/ kalendar"
        eyebrow="Sezona 2026"
        title={t("title")}
        lead={t("subtitle")}
      />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {/* Predstojeći */}
        <section className="mb-14">
          <h2 className="mb-4 font-display text-xl font-extrabold text-navy">{t("upcomingTitle")}</h2>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line2 bg-card p-8 text-center text-sm text-muted">
              {t("noUpcoming")}
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((tr) => {
                const d = formatDateParts(tr.datum_od, tr.datum_do, locale);
                const st = statusByDate(tr.datum_od, tr.datum_do);
                const showDeadline = Boolean(tr.rok_prijave) && st === "najava";
                return (
                  <TournamentCard
                    key={tr.id}
                    slug={tr.legacy_id}
                    dateBig={d.big}
                    dateSmall={d.small}
                    seriesLabel={t(`series.${tr.serija}`)}
                    systemLabel={t(`system.${tr.sistem}`)}
                    name={tr.naziv}
                    host={hostLine(tr)}
                    statusTone={TOURNAMENT_STATUS_TONE[st]}
                    statusLabel={t(`status.${st}`)}
                    deadline={showDeadline ? formatDeadline(tr.rok_prijave, locale) : null}
                    deadlineLabel={t("deadline")}
                    cta={st === "najava" ? t("register") : undefined}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Arhiva po godinama */}
        {years.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-xl font-extrabold text-navy">{t("archiveTitle")}</h2>
            <div className="mb-5 flex flex-wrap gap-2">
              {years.map((y) => (
                <Link
                  key={y}
                  href={`/kalendar?god=${y}`}
                  scroll={false}
                  className={`rounded-full px-3.5 py-1.5 font-mono text-sm font-bold transition ${
                    y === selectedYear
                      ? "bg-navy text-white"
                      : "border border-line2 bg-card text-slate hover:border-clay hover:text-clay"
                  }`}
                >
                  {y}
                </Link>
              ))}
            </div>

            <div className="space-y-3">
              {archiveYear.map((tr) => {
                const d = formatDateParts(tr.datum_od, tr.datum_do, locale);
                return (
                  <TournamentCard
                    key={tr.id}
                    slug={tr.legacy_id}
                    dateBig={d.big}
                    dateSmall={d.small}
                    seriesLabel={t(`series.${tr.serija}`)}
                    systemLabel={t(`system.${tr.sistem}`)}
                    name={tr.naziv}
                    host={hostLine(tr)}
                    champions={champs(tr.id)}
                    finished
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
