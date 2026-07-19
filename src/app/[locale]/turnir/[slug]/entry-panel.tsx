import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { selfEnterAction, selfWithdrawAction } from "./actions";

export type EntryPlayer = {
  ime: string;
  prezime: string;
  klub: string | null;
  kategorija: string | null;
  godiste: number | null;
};

export type EntryEvent = {
  eventId: string;
  kategorija: string;
  isOpen: boolean;
  hasDraw: boolean;
  recommended: boolean;
  mine: boolean;
  entries: { name: string; klub: string | null; bodovi: number | null }[];
};

/**
 * Panel samostalne prijave (singl) + javna lista prijavljenih.
 * Prikazuje se samo za predstojeće turnire. Legalnost čuva RLS; ovde je UI.
 */
export async function TournamentEntry({
  loggedIn,
  hasPlayer,
  player,
  events,
  deadlineText,
}: {
  loggedIn: boolean;
  hasPlayer: boolean;
  player: EntryPlayer | null;
  events: EntryEvent[];
  deadlineText: string | null;
}) {
  const t = await getTranslations("tournament");
  const withEntries = events.filter((e) => e.entries.length > 0);
  const age = player?.godiste ? new Date().getFullYear() - player.godiste : null;

  return (
    <>
      <section id="prijava" className="mb-8">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-display text-lg font-bold text-navy">{t("entry.title")}</h2>
          {deadlineText ? (
            <span className="font-mono text-xs font-semibold text-warn">
              {t("entry.deadlineShort", { date: deadlineText })}
            </span>
          ) : (
            <span className="text-xs font-semibold text-court-dark">{t("entry.openNow")}</span>
          )}
        </div>

        {!loggedIn ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-card p-5 shadow-sm sm:flex-row sm:items-center">
            <div>
              <p className="font-display font-bold text-navy">{t("entry.loginTitle")}</p>
              <p className="mt-1 text-sm text-slate">{t("entry.loginBody")}</p>
            </div>
            <Link
              href="/prijava"
              className="shrink-0 rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-dark sm:ml-auto"
            >
              {t("entry.loginCta")}
            </Link>
          </div>
        ) : !hasPlayer ? (
          <div className="rounded-2xl border border-dashed border-line2 bg-card p-5 text-sm leading-relaxed text-slate">
            {t("entry.noPlayer")}{" "}
            <Link href="/nalog" className="font-semibold text-clay-dark hover:underline">
              {t("entry.noPlayerLink")}
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5">
            <p className="mb-4 text-sm text-slate">{t("entry.lead")}</p>

            {player && (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-bg2 px-3.5 py-3">
                <Avatar ime={player.ime} prezime={player.prezime} size={42} />
                <div className="min-w-0">
                  <b className="block truncate font-display text-[15px] font-bold text-navy">
                    {player.ime} {player.prezime}
                  </b>
                  <span className="block truncate text-xs text-muted">{player.klub ?? "—"}</span>
                </div>
                <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-1.5">
                  {player.kategorija && (
                    <span className="rounded-lg border border-line2 bg-card px-2 py-1 font-mono text-[11px] font-bold text-slate">
                      {t("entry.qualityTag", { k: player.kategorija })}
                    </span>
                  )}
                  {age && (
                    <span className="rounded-lg border border-line2 bg-card px-2 py-1 font-mono text-[11px] font-bold text-slate">
                      {t("entry.ageTag", { age })}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-3 space-y-2">
              {events.map((ev) => (
                <form
                  key={ev.eventId}
                  action={ev.mine ? selfWithdrawAction : selfEnterAction}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    ev.mine
                      ? "border-court/45 bg-court/5"
                      : ev.recommended
                        ? "border-court/25 bg-court/4"
                        : "border-line bg-card"
                  }`}
                >
                  <input type="hidden" name="eventId" value={ev.eventId} />
                  <span className="w-11 shrink-0 text-center font-mono text-lg font-extrabold text-navy">
                    {ev.kategorija}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <b className="text-sm text-ink">
                        {t("discipline.singl")} {ev.kategorija}
                      </b>
                      {ev.recommended && !ev.mine && (
                        <span className="rounded bg-ball/45 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-court-dark">
                          {t("entry.recommended")}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted">
                      {t("entry.count", { n: ev.entries.length })}
                    </span>
                  </div>
                  {ev.mine && ev.isOpen ? (
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg border border-court/35 bg-court/12 px-3.5 py-2 text-[13px] font-semibold text-court-dark transition hover:bg-court/20"
                    >
                      ✓ {t("entry.withdraw")}
                    </button>
                  ) : ev.mine ? (
                    // prijavljen, ali odjava više nije moguća (rok/žreb)
                    <span className="shrink-0 rounded-lg border border-court/35 bg-court/12 px-3.5 py-2 text-[13px] font-semibold text-court-dark">
                      ✓ {t("entry.entered")}
                    </span>
                  ) : ev.isOpen ? (
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg bg-clay px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-clay-dark"
                    >
                      {t("entry.enter")}
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-lg bg-bg2 px-3.5 py-2 text-[13px] font-semibold text-muted">
                      {ev.hasDraw ? t("entry.drawPublished") : t("entry.entriesClosed")}
                    </span>
                  )}
                </form>
              ))}
            </div>

            <p className="mt-4 flex gap-2 rounded-xl bg-bg2 px-3 py-2.5 text-xs leading-relaxed text-slate">
              <span className="font-extrabold text-clay-dark">i</span>
              <span>{t("entry.singlesOnly")}</span>
            </p>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-bold text-navy">{t("entry.acceptanceTitle")}</h2>
        {withEntries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line2 bg-card p-5 text-sm text-muted">
            {t("entry.acceptanceEmpty")}
          </p>
        ) : (
          <div className="space-y-3">
            {withEntries.map((ev) => (
              <div key={ev.eventId} className="overflow-hidden rounded-2xl border border-line bg-card">
                <div className="bg-bg2 px-4 py-2 text-xs font-bold uppercase tracking-wide text-court-dark">
                  {t("discipline.singl")} · {ev.kategorija} · {ev.entries.length}
                </div>
                <ol>
                  {ev.entries.map((p, i) => (
                    <li
                      key={`${ev.eventId}-${i}`}
                      className="flex items-center gap-3 border-t border-line px-4 py-2 text-sm"
                    >
                      <span className="w-6 shrink-0 text-center font-mono font-bold text-clay-dark">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-navy">{p.name}</span>
                      <span className="hidden max-w-[40%] truncate text-xs text-muted sm:block">
                        {p.klub ?? ""}
                      </span>
                      <span className="shrink-0 font-mono text-sm font-bold text-court-dark">
                        {p.bodovi ?? "—"}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
