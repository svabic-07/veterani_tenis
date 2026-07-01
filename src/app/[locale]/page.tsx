import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getUpcomingTournaments, type UpcomingTournament } from "@/lib/data/tournaments";
import { formatDateRange } from "@/lib/format";

export const revalidate = 600;

const STATS = [
  { value: "~2.600", key: "players" },
  { value: "5 + 11", key: "categories" },
  { value: "4 + 1", key: "series" },
  { value: "S · D · X", key: "disciplines" },
] as const;

const CARDS = [
  { key: "calendar", href: "/kalendar", icon: "📅", tone: "navy" },
  { key: "players", href: "/igraci", icon: "👤", tone: "green" },
  { key: "referee", href: "/sudija", icon: "⚖️", tone: "clay" },
  { key: "rules", href: "/pravilnik", icon: "📖", tone: "ball" },
] as const;

const TONE: Record<string, string> = {
  navy: "border-t-navy",
  green: "border-t-court",
  clay: "border-t-clay",
  ball: "border-t-ball-deep",
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const upcoming = await getUpcomingTournaments(3);
  return <Home locale={locale} upcoming={upcoming} />;
}

function Home({
  locale,
  upcoming,
}: {
  readonly locale: string;
  readonly upcoming: UpcomingTournament[];
}) {
  const t = useTranslations("home");
  const tc = useTranslations("calendar");

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden text-white">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1100px 460px at 88% -8%, rgba(214,232,75,.20), transparent 60%)," +
              "radial-gradient(760px 420px at 6% 16%, rgba(200,85,61,.40), transparent 62%)," +
              "linear-gradient(135deg,#16263E 0%, #13314A 52%, #1C5340 100%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.13em] backdrop-blur">
            <i className="h-2 w-2 rounded-full bg-ball" />
            {t("eyebrow")}
          </span>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">{t("lead")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/kalendar"
              className="rounded-xl bg-clay px-5 py-3 font-semibold text-white transition hover:bg-clay-dark"
            >
              {t("ctaCalendar")}
            </Link>
            <Link
              href="/rang-liste"
              className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20"
            >
              {t("ctaRankings")}
            </Link>
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-6 border-t border-white/15 pt-8 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.key}>
                <dt className="font-display text-2xl font-bold text-white">{s.value}</dt>
                <dd className="mt-1 text-sm text-white/60">{t(`stats.${s.key}`)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* NAREDNI TURNIRI */}
      {upcoming.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">{t("sections.upcoming")}</h2>
              <p className="mt-1 text-slate">{t("sections.upcomingSub")}</p>
            </div>
            <Link href="/kalendar" className="hidden shrink-0 text-sm font-semibold text-clay-dark hover:underline sm:block">
              {t("ctaCalendar")} →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((tr) => (
              <Link
                key={tr.id}
                href={tr.legacy_id ? `/turnir/${tr.legacy_id}` : "/kalendar"}
                className="group rounded-2xl border border-line bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-[var(--shadow-tvs)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-full bg-clay/12 px-2.5 py-0.5 text-xs font-bold text-clay-dark">
                    {tc(`series.${tr.serija}`)}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {formatDateRange(tr.datum_od, tr.datum_do, locale)}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-navy">{tr.naziv}</h3>
                <p className="mt-1 text-sm text-slate">
                  {tr.clubs?.naziv}
                  {tr.clubs?.grad ? ` · ${tr.clubs.grad}` : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* EXPLORE */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-8 flex items-baseline gap-3">
          <span className="font-mono text-sm text-clay">/ tvs</span>
          <h2 className="text-2xl font-extrabold sm:text-3xl">{t("sections.explore")}</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              className={`group rounded-2xl border border-line border-t-[3px] ${TONE[c.tone]} bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[var(--shadow-tvs)]`}
            >
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-bg2 text-xl">
                {c.icon}
              </div>
              <h3 className="text-base font-bold text-navy">{t(`cards.${c.key}.title`)}</h3>
              <p className="mt-1.5 text-sm text-slate">{t(`cards.${c.key}.desc`)}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
