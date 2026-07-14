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

      {(statusLabel || deadline) && (
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
        </div>
      )}
    </div>
  );

  const cls =
    "block rounded-2xl border border-line bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-line2 hover:shadow-[var(--shadow-tvs)] sm:p-[18px]";

  return slug ? (
    <Link href={`/turnir/${slug}`} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
