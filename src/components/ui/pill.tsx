import type { ReactNode } from "react";

/**
 * Status badge / pill. Jedan pogled = gde nešto stoji.
 * `live` pušta pulsirajuću tačkicu (meč u toku); `dot` statičnu.
 */
export type PillTone = "open" | "live" | "done" | "info" | "warn" | "ok" | "neutral";

const TONES: Record<PillTone, { cls: string; dot: string }> = {
  open: { cls: "bg-ball/35 text-court-dark", dot: "bg-ball-deep" },
  live: { cls: "bg-clay text-white", dot: "bg-white" },
  done: { cls: "bg-bg2 text-muted", dot: "bg-muted" },
  info: { cls: "bg-info/15 text-info", dot: "bg-info" },
  warn: { cls: "bg-warn/15 text-[#9b5f0e]", dot: "bg-warn" },
  ok: { cls: "bg-ok/15 text-ok", dot: "bg-ok" },
  neutral: { cls: "bg-bg2 text-slate", dot: "bg-slate" },
};

export function Pill({
  children,
  tone = "neutral",
  dot = false,
  live = false,
}: {
  children: ReactNode;
  tone?: PillTone;
  dot?: boolean;
  live?: boolean;
}) {
  const t = TONES[tone];
  const showDot = dot || live;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold leading-none ${t.cls}`}
    >
      {showDot && (
        <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${t.dot} ${live ? "tvs-pulse" : ""}`} />
      )}
      {children}
    </span>
  );
}

/** Mapiranje tournament_status → Pill tone + oznaka (koristi t() za label spolja). */
export const TOURNAMENT_STATUS_TONE: Record<string, PillTone> = {
  najava: "neutral",
  prijave: "open",
  zreb: "info",
  u_toku: "live",
  zavrsen: "done",
  ponovo_otvoren: "warn",
};
