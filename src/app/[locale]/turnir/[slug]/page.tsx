import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getTournamentBySlug, getEntriesForTournament } from "@/lib/data/tournaments";
import { getDrawsForTournament, type TournamentDraw } from "@/lib/data/draws";
import { isRoundRobin, groupStandings } from "@/lib/draw-groups";
import { getPlayerById } from "@/lib/data/players";
import { createClient } from "@/lib/supabase/server";
import { statusByDate, isUpcoming } from "@/lib/tournament-status";
import { DrawBracket } from "@/components/draw-bracket";
import { PageHero } from "@/components/ui/page-hero";
import { Pill, TOURNAMENT_STATUS_TONE } from "@/components/ui/pill";
import { formatDateRange, formatDeadline, formatMatchTime } from "@/lib/format";
import {
  TournamentEntry,
  type EntryEvent,
  type EntryPlayer,
} from "./entry-panel";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const tr = await getTournamentBySlug(slug);
  return { title: tr?.naziv ?? (locale === "sr" ? "Turnir" : "Tournament") };
}

const DISCIPLINE_ORDER = ["singl", "dubl", "miks"] as const;

// Redosled konkurencija: kategorije „od prve nadalje" (I…IX pa starosne 20,30…), pa disciplina.
const KAT_RANK: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9,
};
const catRank = (k: string) => KAT_RANK[k] ?? 100 + (Number.parseInt(k, 10) || 999);
const discRank = (d: string) => {
  const i = DISCIPLINE_ORDER.indexOf(d as (typeof DISCIPLINE_ORDER)[number]);
  return i < 0 ? 99 : i;
};

// Pobednik konkurencije: iz poslednjeg (najvišeg) kola — finale (pozicija 1),
// a ako je to kolo round-robin grupa, pobednik je prvi po pobedama.
function championOf(d: TournamentDraw): string | null {
  const resolved = d.matches.filter((m) => m.kolo > 0 && m.winner_slot != null);
  if (resolved.length === 0) return null;
  const last = Math.max(...resolved.map((m) => m.kolo));
  const lastMatches = d.matches.filter((m) => m.kolo === last);
  if (isRoundRobin(lastMatches)) {
    return groupStandings(lastMatches)[0]?.name ?? null;
  }
  const fin = lastMatches.find((m) => m.pozicija === 1 && m.winner_slot != null);
  const w = fin ? (fin.winner_slot === 1 ? fin.p1 : fin.p2) : null;
  return w ? `${w.ime} ${w.prezime}` : null;
}

export default async function TurnirPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("tournament");
  const tc = await getTranslations("calendar");
  const td = await getTranslations("draw");
  const tr = await getTournamentBySlug(slug);
  if (!tr) notFound();

  const draws = await getDrawsForTournament(tr.id);

  const club = tr.clubs;
  const dir = tr.direktor;

  // Status po datumu (uvezeni podaci su svi `zavrsen`).
  const status = statusByDate(tr.datum_od, tr.datum_do);
  const upcoming = isUpcoming(tr.datum_od, tr.datum_do);

  // Panel prijave — samo za predstojeće turnire koji imaju singl konkurencije.
  const singlEvents = tr.tournament_events.filter((e) => e.disciplina === "singl");
  let entryProps:
    | {
        loggedIn: boolean;
        hasPlayer: boolean;
        player: EntryPlayer | null;
        events: EntryEvent[];
        deadlineText: string | null;
      }
    | null = null;

  if (upcoming && singlEvents.length > 0) {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const claims = claimsData?.claims;

    let myPlayerId: string | null = null;
    let player: EntryPlayer | null = null;
    if (claims) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("player_id")
        .eq("id", claims.sub)
        .maybeSingle();
      myPlayerId = profile?.player_id ?? null;
      if (myPlayerId) {
        const p = await getPlayerById(myPlayerId);
        if (p) {
          player = {
            ime: p.ime,
            prezime: p.prezime,
            klub: p.clubs?.naziv ?? null,
            kategorija: p.kategorija,
            godiste: p.godiste,
          };
        }
      }
    }

    const entries = await getEntriesForTournament(tr.id);
    const publishedEventIds = new Set(draws.map((d) => d.event.id));
    const withinDeadline =
      !tr.rok_prijave || new Date().getTime() <= new Date(tr.rok_prijave).getTime();
    const currYear = new Date().getFullYear();
    const isRecommended = (kat: string): boolean => {
      if (!player) return false;
      if (/^\d+$/.test(kat)) return player.godiste != null && currYear - player.godiste >= Number(kat);
      if (/^[IVX]+$/.test(kat)) return player.kategorija === kat;
      return false;
    };

    const events: EntryEvent[] = singlEvents.map((e) => ({
      eventId: e.id,
      kategorija: e.kategorija,
      isOpen: withinDeadline && !publishedEventIds.has(e.id),
      recommended: isRecommended(e.kategorija),
      mine: myPlayerId != null && entries.some((x) => x.eventId === e.id && x.playerId === myPlayerId),
      entries: entries
        .filter((x) => x.eventId === e.id)
        .sort((a, b) => (b.bodovi ?? -1) - (a.bodovi ?? -1))
        .map((x) => ({ name: `${x.ime} ${x.prezime}`, klub: x.klub, bodovi: x.bodovi })),
    }));

    entryProps = {
      loggedIn: !!claims,
      hasPlayer: !!player,
      player,
      events,
      deadlineText: tr.rok_prijave ? formatDeadline(tr.rok_prijave, locale) : null,
    };
  }

  // Grupiši konkurencije po disciplini
  const byDiscipline = DISCIPLINE_ORDER.map((disc) => ({
    disc,
    kategorije: tr.tournament_events
      .filter((e) => e.disciplina === disc)
      .map((e) => e.kategorija),
  })).filter((g) => g.kategorije.length > 0);

  // Žrebovi sortirani po kategoriji (I…IX pa starosne), pa disciplini — lakše nalaženje.
  const sortedDraws = [...draws].sort(
    (a, b) =>
      discRank(a.event.disciplina) - discRank(b.event.disciplina) ||
      catRank(a.event.kategorija) - catRank(b.event.kategorija),
  );

  const info: { label: string; value: string }[] = [
    { label: t("series"), value: tc(`series.${tr.serija}`) },
    { label: t("system"), value: tc(`system.${tr.sistem}`) },
    { label: t("dates"), value: formatDateRange(tr.datum_od, tr.datum_do, locale) },
    ...(club ? [{ label: t("host"), value: `${club.naziv}${club.grad ? ` · ${club.grad}` : ""}` }] : []),
    ...(tr.direktor_ime || dir
      ? [{ label: t("director"), value: tr.direktor_ime ?? `${dir!.ime} ${dir!.prezime}` }]
      : []),
    ...(tr.rok_prijave ? [{ label: t("deadline"), value: formatDeadline(tr.rok_prijave, locale) }] : []),
  ];

  return (
    <>
      <PageHero
        compact
        crumb={t("backToCalendar")}
        eyebrow={tc(`series.${tr.serija}`)}
        title={tr.naziv}
        lead={`${formatDateRange(tr.datum_od, tr.datum_do, locale)}${
          club ? ` · ${club.naziv}${club.grad ? `, ${club.grad}` : ""}` : ""
        }`}
        badge={
          <Pill tone={TOURNAMENT_STATUS_TONE[status]} live={status === "u_toku"}>
            {tc(`status.${status}`)}
          </Pill>
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {entryProps && <TournamentEntry {...entryProps} />}

        {(() => {
          const scheduled = draws
            .flatMap((d) =>
              d.matches
                .filter((m) => m.termin)
                .map((m) => ({ ...m, kategorija: d.event.kategorija, disciplina: d.event.disciplina })),
            )
            .sort((a, b) => (a.termin! < b.termin! ? -1 : 1));
          if (scheduled.length === 0) return null;
          return (
            <section className="mb-8">
              <h3 className="mb-3 font-display text-lg font-bold text-navy">
                {td("scheduleTitle")}
              </h3>
              <ul className="overflow-hidden rounded-2xl border border-line bg-card">
                {scheduled.map((m, i) => (
                  <li
                    key={m.id}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm ${
                      i % 2 ? "bg-[#FBF8F3]" : ""
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold text-clay">
                      {formatMatchTime(m.termin, locale)}
                    </span>
                    {m.teren && (
                      <span className="rounded bg-court/12 px-1.5 py-0.5 text-xs font-semibold text-court-dark">
                        {m.teren}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-navy">
                      {m.p1 ? `${m.p1.ime[0]}. ${m.p1.prezime}` : "—"} —{" "}
                      {m.p2 ? `${m.p2.ime[0]}. ${m.p2.prezime}` : "—"}
                    </span>
                    <span className="text-xs text-muted">
                      {t(`discipline.${m.disciplina}`)} · {m.kategorija}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })()}

        {draws.length > 0 ? (
          <div className="space-y-8">
            {sortedDraws.map((d) => {
              const champ = !upcoming ? championOf(d) : null;
              return (
                <section key={d.id}>
                  <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-display text-lg font-bold text-navy">
                      {td("title")} · {t(`discipline.${d.event.disciplina}`)} ·{" "}
                      {d.event.kategorija}
                    </h3>
                    <span className="text-xs text-muted">
                      {d.kostur ? td("bracketOf", { n: d.kostur }) : null}
                      {d.broj_nosilaca > 0 ? ` · ${td("seedsCount", { n: d.broj_nosilaca })}` : null}
                    </span>
                    {champ && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-court/12 px-2.5 py-0.5 text-xs font-bold text-court-dark">
                        🏆 {t("champion")}: {champ}
                      </span>
                    )}
                  </div>
                  <DrawBracket draw={d} />
                </section>
              );
            })}
          </div>
        ) : !upcoming ? (
          <div className="rounded-2xl border border-dashed border-line2 bg-card p-6 text-sm text-slate">
            {t("soon")}
          </div>
        ) : null}

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
