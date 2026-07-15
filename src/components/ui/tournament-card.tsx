import { Link } from "@/i18n/navigation";
import { Pill, type PillTone } from "./pill";

export type Champion = { cat: string; name: string };

/**
 * Kartica turnira — osnovna jedinica kalendara/početne. Veliki mono datum,
 * serija badge, naziv, domaćin·grad, status badge, rok. Za arhivu prosledi
 * `champions` → 🏆 pobednici po kategoriji direktno na kartici.
 */
export function TournamentCard({
  slug,
  dateBig,
  dateSmall,
  seriesLabel,
  systemLabel,
  name,
  host,
  statusTone,
  statusLabel,
  deadline,
  deadlineLabel,
  champions,
  finished,
  cta,
}: {
  slug: string | null;
  dateBig: string;
  dateSmall: string;
  seriesLabel: string;
  systemLabel?: string;
  name: string;
  host?: string;
  statusTone?: PillTone;
  statusLabel?: string;
  deadline?: string | null;
  deadlineLabel?: string;
  champions?: Champion[];
  finished?: boolean;
  cta?: string;
}) {
  const inner = (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[104px_minmax(0,1fr)_auto] sm:items-center">
      <div>
        <div className="font-mono text-2xl font-extrabold leading-tight text-navy">{dateBig}</div>
        {dateSmall && (
          <div className="mt-0.5 font-mono text-xs uppercase tracking-wide text-muted">
            {dateSmall}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <Pill tone="neutral">{seriesLabel}</Pill>
          {systemLabel && <span className="text-xs font-medium text-muted">{systemLabel}</span>}
        </div>
        <h3 className="truncate font-display text-lg font-extrabold text-navy sm:text-xl">{name}</h3>
        {host && <p className="mt-0.5 truncate text-sm text-slate">{host}</p>}
        {champions && champions.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1.5">
            {champions.map((c) => (
              <span key={`${c.cat}-${c.name}`} className="text-[13px] font-semibold text-court-dark">
                🏆 <span className="font-mono font-bold text-muted">{c.cat}</span>{" "}
                <span className="text-navy">{c.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {(statusLabel || deadline || cta) && (
        <div className="col-span-2 flex flex-row-reverse items-center justify-end gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:gap-2">
          {statusLabel && statusTone && (
            <Pill tone={statusTone} live={statusTone === "live"} dot={statusTone === "open"}>
              {statusLabel}
            </Pill>
          )}
          {deadline && (
            <span className="text-xs text-muted">
              {deadlineLabel}: <span className="font-mono text-slate">{deadline}</span>
            </span>
          )}
          {cta && (
            <span className="rounded-lg bg-clay px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition group-hover:bg-clay-dark">
              {cta}
            </span>
          )}
        </div>
      )}
    </div>
  );

  // Završeni turniri = topliji, blago utišan background (bg2) da se razlikuju
  // od predstojećih (bela kartica).
  const cls = `group block rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-tvs)] sm:p-[18px] ${
    finished
      ? "border-line2 bg-bg2 hover:border-clay/40"
      : "border-line bg-card hover:border-line2"
  }`;

  return slug ? (
    <Link href={`/turnir/${slug}`} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
