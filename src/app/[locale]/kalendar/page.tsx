import { setRequestLocale, getTranslations } from "next-intl/server";
import { getTournaments } from "@/lib/data/tournaments";
import { formatDateRange, formatDeadline } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  najava: "bg-white border border-line2 text-slate",
  prijave: "bg-ball/30 text-court-dark",
  zreb: "bg-clay/15 text-clay-dark",
  u_toku: "bg-clay text-white",
  zavrsen: "bg-bg2 text-muted",
  ponovo_otvoren: "bg-info/15 text-info",
};

type CardVM = {
  id: string;
  dateRange: string;
  seriesLabel: string;
  systemLabel: string;
  name: string;
  hostLine: string;
  statusKey: string;
  statusLabel: string;
  deadlineLabel: string | null;
};

export default async function KalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("calendar");
  const tournaments = await getTournaments();

  const items: CardVM[] = tournaments.map((tr) => {
    const club = tr.clubs;
    const dir = tr.direktor;
    const hostParts = [
      club?.naziv,
      club?.grad,
      dir ? `${t("director")}: ${dir.ime} ${dir.prezime}` : null,
    ].filter(Boolean);
    const showDeadline =
      tr.rok_prijave && (tr.status === "prijave" || tr.status === "najava");
    return {
      id: tr.id,
      dateRange: formatDateRange(tr.datum_od, tr.datum_do, locale),
      seriesLabel: t(`series.${tr.serija}`),
      systemLabel: t(`system.${tr.sistem}`),
      name: tr.naziv,
      hostLine: hostParts.join(" · "),
      statusKey: tr.status,
      statusLabel: t(`status.${tr.status}`),
      deadlineLabel: showDeadline
        ? `${t("deadline")}: ${formatDeadline(tr.rok_prijave, locale)}`
        : null,
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="font-mono text-sm text-clay">/ kalendar</span>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-navy sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-slate">{t("subtitle")}</p>
        <p className="mt-3 text-sm font-semibold text-muted">
          {t("count", { n: items.length })}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line2 bg-card p-10 text-center text-muted">
          {t("empty")}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <TournamentCard key={it.id} it={it} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TournamentCard({ it }: { readonly it: CardVM }) {
  return (
    <li className="grid gap-4 rounded-2xl border border-line bg-card p-5 shadow-sm transition hover:border-line2 hover:shadow-[var(--shadow-tvs)] sm:grid-cols-[140px_1fr_auto] sm:items-center">
      <div className="font-display text-lg font-bold leading-tight text-navy">
        {it.dateRange}
      </div>

      <div className="min-w-0">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-clay/12 px-2.5 py-0.5 text-xs font-bold text-clay-dark">
            {it.seriesLabel}
          </span>
          <span className="text-xs font-medium text-muted">{it.systemLabel}</span>
        </div>
        <h2 className="truncate font-display text-lg font-bold text-navy">{it.name}</h2>
        <p className="mt-0.5 truncate text-sm text-slate">{it.hostLine}</p>
      </div>

      <div className="flex flex-row-reverse items-center justify-end gap-3 sm:flex-col sm:items-end sm:gap-1.5">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
            STATUS_STYLE[it.statusKey] ?? STATUS_STYLE.najava
          }`}
        >
          {it.statusLabel}
        </span>
        {it.deadlineLabel ? (
          <span className="text-xs text-muted">{it.deadlineLabel}</span>
        ) : null}
      </div>
    </li>
  );
}
