import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getTournaments,
  getWinnersForTournaments,
  type TournamentWinner,
} from "@/lib/data/tournaments";
import { formatDateRange, formatDeadline } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "calendar" });
  return { title: t("title") };
}

const STATUS_STYLE: Record<string, string> = {
  najava: "bg-white border border-line2 text-slate",
  prijave: "bg-ball/30 text-court-dark",
  zreb: "bg-clay/15 text-clay-dark",
  u_toku: "bg-clay text-white",
  zavrsen: "bg-bg2 text-muted",
  ponovo_otvoren: "bg-info/15 text-info",
};

const DISC_SHORT: Record<string, string> = { singl: "S", dubl: "D", miks: "X" };

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

  // predstojeći = najavljeni/aktivni koji nisu prošli; arhiva = završeni po godini
  const today = new Date().toISOString().slice(0, 10);
  const endOf = (tr: (typeof all)[number]) => tr.datum_do ?? tr.datum_od ?? "";
  const upcoming = all
    .filter((tr) => tr.status !== "zavrsen" && endOf(tr) >= today)
    .sort((a, b) => (a.datum_od ?? "").localeCompare(b.datum_od ?? ""));
  const archive = all
    .filter((tr) => tr.status === "zavrsen")
    .sort((a, b) => (b.datum_od ?? "").localeCompare(a.datum_od ?? ""));

  // godine arhive (opadajuće)
  const years = [...new Set(archive.map((tr) => (tr.datum_od ?? "").slice(0, 4)).filter(Boolean))];
  const selectedYear =
    typeof sp.god === "string" && years.includes(sp.god) ? sp.god : years[0] ?? "";
  const archiveYear = archive.filter((tr) => (tr.datum_od ?? "").startsWith(selectedYear));

  // pobednici za prikazanu godinu arhive
  const winners = await getWinnersForTournaments(archiveYear.map((tr) => tr.id));

  const hostLine = (tr: (typeof all)[number]) =>
    [tr.clubs?.naziv, tr.clubs?.grad].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="font-mono text-sm text-clay">/ kalendar</span>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-navy sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-slate">{t("subtitle")}</p>
      </header>

      {/* Predstojeći */}
      <section className="mb-12">
        <h2 className="mb-4 font-display text-xl font-bold text-navy">{t("upcomingTitle")}</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line2 bg-card p-8 text-center text-sm text-muted">
            {t("noUpcoming")}
          </div>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((tr) => (
              <li key={tr.id}>
                <TournamentCard
                  slug={tr.legacy_id}
                  dateRange={formatDateRange(tr.datum_od, tr.datum_do, locale)}
                  seriesLabel={t(`series.${tr.serija}`)}
                  systemLabel={t(`system.${tr.sistem}`)}
                  name={tr.naziv}
                  host={hostLine(tr)}
                  right={
                    <div className="flex flex-row-reverse items-center justify-end gap-3 sm:flex-col sm:items-end sm:gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                          STATUS_STYLE[tr.status] ?? STATUS_STYLE.najava
                        }`}
                      >
                        {t(`status.${tr.status}`)}
                      </span>
                      {tr.rok_prijave && (tr.status === "prijave" || tr.status === "najava") ? (
                        <span className="text-xs text-muted">
                          {t("deadline")}: {formatDeadline(tr.rok_prijave, locale)}
                        </span>
                      ) : null}
                    </div>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Arhiva po godinama */}
      {years.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold text-navy">{t("archiveTitle")}</h2>
          <div className="mb-5 flex flex-wrap gap-2">
            {years.map((y) => (
              <Link
                key={y}
                href={`/kalendar?god=${y}`}
                scroll={false}
                className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                  y === selectedYear
                    ? "bg-navy text-white"
                    : "border border-line2 bg-card text-slate hover:border-clay hover:text-clay"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>

          <ul className="space-y-3">
            {archiveYear.map((tr) => (
              <li key={tr.id}>
                <TournamentCard
                  slug={tr.legacy_id}
                  dateRange={formatDateRange(tr.datum_od, tr.datum_do, locale)}
                  seriesLabel={t(`series.${tr.serija}`)}
                  systemLabel={t(`system.${tr.sistem}`)}
                  name={tr.naziv}
                  host={hostLine(tr)}
                  winners={winners.get(tr.id)}
                  disc={DISC_SHORT}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TournamentCard({
  slug,
  dateRange,
  seriesLabel,
  systemLabel,
  name,
  host,
  right,
  winners,
  disc,
}: {
  readonly slug: string | null;
  readonly dateRange: string;
  readonly seriesLabel: string;
  readonly systemLabel: string;
  readonly name: string;
  readonly host: string;
  readonly right?: React.ReactNode;
  readonly winners?: TournamentWinner[];
  readonly disc?: Record<string, string>;
}) {
  const inner = (
    <div className="grid gap-4 sm:grid-cols-[130px_1fr_auto] sm:items-center">
      <div className="font-display text-lg font-bold leading-tight text-navy">{dateRange}</div>

      <div className="min-w-0">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-clay/12 px-2.5 py-0.5 text-xs font-bold text-clay-dark">
            {seriesLabel}
          </span>
          <span className="text-xs font-medium text-muted">{systemLabel}</span>
        </div>
        <h3 className="truncate font-display text-lg font-bold text-navy">{name}</h3>
        {host ? <p className="mt-0.5 truncate text-sm text-slate">{host}</p> : null}

        {winners && winners.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {winners.map((w) => (
              <span key={`${w.kategorija}-${w.disciplina}`} className="text-xs text-slate">
                <span className="mr-1">🏆</span>
                <span className="font-mono font-semibold text-court-dark">
                  {w.kategorija}
                  {disc && w.disciplina !== "singl" ? `/${disc[w.disciplina]}` : ""}
                </span>{" "}
                <span className="font-medium text-navy">
                  {w.ime[0]}. {w.prezime}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {right ? <div>{right}</div> : <div />}
    </div>
  );

  const cls =
    "block rounded-2xl border border-line bg-card p-5 shadow-sm transition hover:border-line2 hover:shadow-[var(--shadow-tvs)]";

  return slug ? (
    <Link href={`/turnir/${slug}`} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
