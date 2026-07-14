import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getUpcomingTournaments,
  getRecentTournaments,
  getWinnersForTournaments,
  getSiteStats,
} from "@/lib/data/tournaments";
import { getTopRankings } from "@/lib/data/players";
import { formatDateParts } from "@/lib/format";
import { statusByDate } from "@/lib/tournament-status";
import { PageHero } from "@/components/ui/page-hero";
import { TournamentCard } from "@/components/ui/tournament-card";
import { Icon } from "@/components/ui/icon";
import { TOURNAMENT_STATUS_TONE } from "@/components/ui/pill";

export const revalidate = 600;

const MODULES = [
  { key: "calendar", href: "/kalendar", icon: "calendar", tone: "border-t-navy" },
  { key: "players", href: "/igraci", icon: "users", tone: "border-t-court" },
  { key: "referee", href: "/sudija", icon: "flag", tone: "border-t-clay" },
  { key: "rules", href: "/pravilnik", icon: "book", tone: "border-t-ball-deep" },
] as const;

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const initials = (ime: string, prezime: string) => `${ime[0] ?? ""}. ${prezime}`;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tc = await getTranslations("calendar");

  const [stats, upcoming, recent, topRank] = await Promise.all([
    getSiteStats(),
    getUpcomingTournaments(3),
    getRecentTournaments(3),
    getTopRankings("I", "singl", 5),
  ]);
  const winners = await getWinnersForTournaments(recent.map((r) => r.id));

  const heroStats = [
    { value: stats.players.toLocaleString("sr-RS"), label: t("stats.players") },
    { value: String(stats.tournaments), label: t("stats.tournaments") },
    { value: "I–V · 20–90", label: t("stats.categories") },
    { value: "4 + Master", label: t("stats.series") },
  ];

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        image="/tvs-hero-veterani.webp"
        title={t("title")}
        lead={t("lead")}
        stats={heroStats}
      >
        <Link
          href="/kalendar"
          className="rounded-xl bg-clay px-5 py-3 font-semibold text-white transition hover:bg-clay-dark"
        >
          {t("ctaCalendar")}
        </Link>
        <Link
          href="/rang-liste"
          className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20"
        >
          {t("ctaRankings")}
        </Link>
      </PageHero>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* Naredni turniri */}
        {upcoming.length > 0 && (
          <section className="mb-14">
            <SectionHead
              title={t("sections.upcoming")}
              sub={t("sections.upcomingSub")}
              action={
                <Link href="/kalendar" className="text-sm font-semibold text-clay-dark hover:underline">
                  {t("sections.wholeCalendar")} →
                </Link>
              }
            />
            <div className="space-y-3">
              {upcoming.map((tr) => {
                const d = formatDateParts(tr.datum_od, tr.datum_do, locale);
                const st = statusByDate(tr.datum_od, tr.datum_do);
                return (
                  <TournamentCard
                    key={tr.id}
                    slug={tr.legacy_id}
                    dateBig={d.big}
                    dateSmall={d.small}
                    seriesLabel={tc(`series.${tr.serija}`)}
                    name={tr.naziv}
                    host={[tr.clubs?.naziv, tr.clubs?.grad].filter(Boolean).join(" · ")}
                    statusTone={TOURNAMENT_STATUS_TONE[st]}
                    statusLabel={tc(`status.${st}`)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Nedavno odigrano — sa šampionima */}
        {recent.length > 0 && (
          <section className="mb-14">
            <SectionHead
              title={t("sections.recent")}
              sub={t("sections.recentSub")}
              action={
                <Link href="/kalendar" className="text-sm font-semibold text-clay-dark hover:underline">
                  {t("sections.wholeCalendar")} →
                </Link>
              }
            />
            <div className="space-y-3">
              {recent.map((tr) => {
                const d = formatDateParts(tr.datum_od, tr.datum_do, locale);
                const champs = (winners.get(tr.id) ?? [])
                  .slice(0, 6)
                  .map((w) => ({ cat: w.kategorija, name: initials(w.ime, w.prezime) }));
                return (
                  <TournamentCard
                    key={tr.id}
                    slug={tr.legacy_id}
                    dateBig={d.big}
                    dateSmall={d.small}
                    seriesLabel={tc(`series.${tr.serija}`)}
                    name={tr.naziv}
                    host={[tr.clubs?.naziv, tr.clubs?.grad].filter(Boolean).join(" · ")}
                    champions={champs}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Rang vrh + Istraži */}
        <section className="mb-6 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <SectionHead
              title={t("sections.rankingsTop")}
              sub={t("sections.rankingsTopSub")}
              action={
                <Link href="/rang-liste" className="text-sm font-semibold text-clay-dark hover:underline">
                  {t("sections.allRankings")} →
                </Link>
              }
            />
            {topRank.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
                {topRank.map((r, i) => (
                  <Link
                    key={r.players?.id ?? i}
                    href={`/igraci/${r.players?.id}`}
                    className={`flex items-center gap-3 px-4 py-3 transition hover:bg-bg2 ${
                      i > 0 ? "border-t border-line" : ""
                    }`}
                  >
                    <span className="w-8 shrink-0 text-center font-mono text-lg font-extrabold text-navy">
                      {MEDAL[r.mesto ?? 0] ?? `${r.mesto}`}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-navy">
                        {r.players?.ime} {r.players?.prezime}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {r.players?.clubs?.naziv ?? "—"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono font-bold text-court-dark">{r.bodovi}</span>
                      <span className="block text-xs text-muted">{r.broj_turnira} tur.</span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-line2 bg-card p-6 text-sm text-muted">
                {tc("empty")}
              </p>
            )}
          </div>

          <div>
            <SectionHead title={t("sections.explore")} />
            <div className="grid grid-cols-2 gap-3">
              {MODULES.map((m) => (
                <Link
                  key={m.key}
                  href={m.href}
                  className={`flex flex-col gap-2 rounded-2xl border border-line ${m.tone} border-t-[3px] bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-tvs)]`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-clay/10 text-clay-dark">
                    <Icon name={m.icon} size={20} />
                  </span>
                  <span className="mt-1 font-display text-base font-extrabold text-navy">
                    {t(`cards.${m.key}.title`)}
                  </span>
                  <span className="text-[13px] leading-snug text-slate">
                    {t(`cards.${m.key}.desc`)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function SectionHead({
  title,
  sub,
  action,
}: {
  readonly title: string;
  readonly sub?: string;
  readonly action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-navy sm:text-[26px]">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
