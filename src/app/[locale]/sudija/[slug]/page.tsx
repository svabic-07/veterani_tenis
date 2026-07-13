import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDrawsForTournament, type TournamentDraw } from "@/lib/data/draws";
import { DrawBracket } from "@/components/draw-bracket";
import { formatDateRange, isoToBelgradeInput } from "@/lib/format";
import {
  createDrawAction,
  publishDrawAction,
  discardDrawAction,
  enterResultAction,
  finishTournamentAction,
  addEntryAction,
  removeEntryAction,
  scheduleMatchAction,
  swapSlotsAction,
} from "./actions";

export const dynamic = "force-dynamic";

const DRAW_STATUS_STYLE: Record<string, string> = {
  radna: "bg-ball/30 text-navy",
  objavljen: "bg-court/15 text-court-dark",
  zakljucan: "bg-line2 text-slate",
  opozvan: "bg-clay/15 text-clay-dark",
};

function ResultForm({
  m,
  eventId,
  slug,
  locale,
  labels,
}: {
  m: TournamentDraw["matches"][number];
  eventId: string;
  slug: string;
  locale: string;
  labels: { p1: string; p2: string; placeholder: string; save: string; statuses: Record<string, string> };
}) {
  return (
    <form
      action={enterResultAction}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-line2 bg-bg2 p-3"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="matchId" value={m.id} />
      <fieldset className="flex min-w-0 flex-1 basis-52 flex-col gap-1">
        <label className="flex items-center gap-2 text-sm text-navy">
          <input type="radio" name="winner" value="1" required className="accent-court" />
          <span className="truncate">{labels.p1}</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-navy">
          <input type="radio" name="winner" value="2" className="accent-court" />
          <span className="truncate">{labels.p2}</span>
        </label>
      </fieldset>
      <input
        type="text"
        name="rezultat"
        placeholder={labels.placeholder}
        inputMode="numeric"
        className="w-32 rounded-lg border border-line2 bg-card px-3 py-2 font-mono text-sm outline-none focus:border-clay"
      />
      <select
        name="status"
        defaultValue="zavrsen"
        className="rounded-lg border border-line2 bg-card px-2 py-2 text-sm outline-none focus:border-clay"
      >
        {Object.entries(labels.statuses).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg bg-court px-4 py-2 text-sm font-semibold text-white transition hover:bg-court-dark"
      >
        {labels.save}
      </button>
    </form>
  );
}

export default async function SudijaTurnirPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : "";
  const greska = typeof sp.greska === "string" ? sp.greska : "";

  const t = await getTranslations("referee");
  const tt = await getTranslations("tournament");
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    redirect({ href: "/prijava", locale });
    return null;
  }

  const { data: tr } = await supabase
    .from("tournaments")
    .select(
      "id, legacy_id, naziv, status, datum_od, datum_do, mesto, direktor_id, tournament_events ( id, kategorija, disciplina )",
    )
    .eq("legacy_id", slug)
    .maybeSingle();
  if (!tr) notFound();

  // autorizacija: staff ili direktor ovog turnira
  const { data: staff } = await supabase.rpc("is_staff");
  if (!staff) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("player_id")
      .eq("id", claimsData.claims.sub)
      .maybeSingle();
    if (!profile?.player_id || profile.player_id !== tr.direktor_id) {
      redirect({ href: "/sudija", locale });
      return null;
    }
  }

  const draws = await getDrawsForTournament(tr.id);
  const drawByEvent = new Map(draws.map((d) => [d.event.id, d]));

  const eventIds = tr.tournament_events.map((e) => e.id);
  const { data: entryRows } = eventIds.length
    ? await supabase
        .from("entries")
        .select(
          "id, event_id, status, seed, bodovi_snapshot, players!entries_player_id_fkey ( id, ime, prezime, clubs ( naziv ) )",
        )
        .in("event_id", eventIds)
        .in("status", ["prijavljen", "gost"])
        .order("bodovi_snapshot", { ascending: false, nullsFirst: false })
    : { data: null };
  const allEntries = entryRows ?? [];
  const entriesByEvent = new Map<string, typeof allEntries>();
  for (const r of allEntries) {
    const list = entriesByEvent.get(r.event_id) ?? [];
    list.push(r);
    entriesByEvent.set(r.event_id, list);
  }

  // pretraga igrača za dodavanje prijave (?ev=<eventId>&q=<ime>)
  const searchEvent = typeof sp.ev === "string" ? sp.ev : "";
  const searchQ = typeof sp.q === "string" ? sp.q.replace(/[,()%*]/g, "").trim() : "";
  let candidates: { id: string; ime: string; prezime: string; clubs: { naziv: string } | null }[] = [];
  if (searchEvent && searchQ) {
    const entered = (entriesByEvent.get(searchEvent) ?? []).map((e) => e.players!.id);
    let cq = supabase
      .from("players")
      .select("id, ime, prezime, clubs ( naziv )")
      .eq("is_active", true)
      .or(`ime.ilike.%${searchQ}%,prezime.ilike.%${searchQ}%`)
      .order("prezime")
      .limit(8);
    if (entered.length) cq = cq.not("id", "in", `(${entered.join(",")})`);
    const { data } = await cq;
    candidates = data ?? [];
  }

  const resultStatuses = {
    zavrsen: t("result.zavrsen"),
    walkover: t("result.walkover"),
    predaja: t("result.predaja"),
    retiranje: t("result.retiranje"),
  };

  const playerName = (p: { ime: string; prezime: string } | null) =>
    p ? `${p.ime[0]}. ${p.prezime}` : "—";

  // ZAVRŠI TURNIR: bar jedan objavljen žreb, nijedan radni, svi mečevi rešeni
  const published = draws.filter((d) => d.status === "objavljen" || d.status === "zakljucan");
  const canFinish =
    tr.status !== "zavrsen" &&
    published.length > 0 &&
    !draws.some((d) => d.status === "radna") &&
    published.every((d) => d.matches.every((m) => m.winner_slot !== null));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/sudija" className="text-sm font-semibold text-muted transition hover:text-navy">
        ← {t("title")}
      </Link>
      <header className="mb-6 mt-3">
        <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">{tr.naziv}</h1>
        <p className="mt-1 text-sm text-muted">
          {formatDateRange(tr.datum_od, tr.datum_do, locale)}
          {tr.mesto ? ` · ${tr.mesto}` : ""}
        </p>
      </header>

      {ok && (
        <p className="mb-5 rounded-xl border border-court/30 bg-court/8 px-4 py-3 text-sm font-semibold text-court-dark">
          ✅ {t(`ok.${ok}`)}
        </p>
      )}
      {greska && (
        <p className="mb-5 rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay-dark">
          {t(`err.${greska}`)}
        </p>
      )}

      <div className="space-y-6">
        {tr.tournament_events.map((ev) => {
          const draw = drawByEvent.get(ev.id);
          const entries = entriesByEvent.get(ev.id) ?? [];
          const n = entries.length;
          const canEditEntries = !draw || draw.status === "radna";
          const playable = (draw?.matches ?? []).filter(
            (m) => m.winner_slot === null && m.p1 && m.p2,
          );
          const swapSlotOptions =
            draw?.status === "radna" && draw.tip === "eliminacija"
              ? draw.matches
                  .filter((m) => m.kolo <= 1)
                  .flatMap((m) =>
                    ([1, 2] as const).map((slot) => ({
                      value: `${m.id}|${slot}`,
                      label: `${m.kolo === 0 ? t("prelimShort") : `M${m.pozicija}`} · ${
                        playerName(slot === 1 ? m.p1 : m.p2) === "—" &&
                        m.status === "bye"
                          ? "bye"
                          : playerName(slot === 1 ? m.p1 : m.p2)
                      }`,
                    })),
                  )
              : [];
          return (
            <section
              key={ev.id}
              id={`event-${ev.id}`}
              className="rounded-2xl border border-line bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="font-display text-lg font-bold text-navy">
                  {tt(`discipline.${ev.disciplina}`)} · {ev.kategorija}
                </h2>
                <span className="text-xs text-muted">{t("entriesCount", { n })}</span>
                {draw && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      DRAW_STATUS_STYLE[draw.status] ?? ""
                    }`}
                  >
                    {t(`drawStatus.${draw.status}`)}
                  </span>
                )}
                <div className="ml-auto flex flex-wrap gap-2">
                  {(!draw || draw.status === "radna") && (
                    <form action={createDrawAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="eventId" value={ev.id} />
                      <button
                        type="submit"
                        disabled={n < 3}
                        className="rounded-lg bg-clay px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-clay-dark disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {draw ? t("redraw") : t("createDraw")}
                      </button>
                    </form>
                  )}
                  {draw?.status === "radna" && (
                    <>
                      <form action={publishDrawAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="eventId" value={ev.id} />
                        <input type="hidden" name="drawId" value={draw.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-court px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-court-dark"
                        >
                          {t("publishDraw")}
                        </button>
                      </form>
                      <form action={discardDrawAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="eventId" value={ev.id} />
                        <input type="hidden" name="drawId" value={draw.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-line2 px-3.5 py-2 text-sm font-semibold text-slate transition hover:border-clay hover:text-clay"
                        >
                          {t("discardDraw")}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>

              {!draw && n < 3 && (
                <p className="mt-3 text-sm text-muted">{t("needEntries")}</p>
              )}

              {/* Prijave: lista + dodavanje (dok žreb nije objavljen) */}
              {canEditEntries && (
                <details className="mt-4 rounded-xl border border-line2 bg-bg2 p-3" open={n < 3}>
                  <summary className="cursor-pointer text-sm font-semibold text-navy">
                    {t("entriesTitle", { n })}
                  </summary>
                  {n > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {entries.map((e) => (
                        <li key={e.id} className="flex items-center gap-2 text-sm">
                          <span className="min-w-0 flex-1 truncate text-navy">
                            {e.players!.ime} {e.players!.prezime}
                            <span className="text-xs text-muted">
                              {e.players!.clubs?.naziv ? ` · ${e.players!.clubs.naziv}` : ""}
                              {e.bodovi_snapshot !== null ? ` · ${e.bodovi_snapshot}` : ""}
                            </span>
                          </span>
                          <form action={removeEntryAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="slug" value={slug} />
                            <input type="hidden" name="eventId" value={ev.id} />
                            <input type="hidden" name="entryId" value={e.id} />
                            <button
                              type="submit"
                              className="rounded-md px-2 py-1 text-xs font-semibold text-clay transition hover:bg-clay/10"
                            >
                              {t("removeEntry")}
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form method="get" className="mt-3 flex gap-2">
                    <input type="hidden" name="ev" value={ev.id} />
                    <input
                      type="search"
                      name="q"
                      defaultValue={searchEvent === ev.id ? searchQ : ""}
                      placeholder={t("searchPlayer")}
                      className="min-w-0 flex-1 rounded-lg border border-line2 bg-card px-3 py-2 text-sm outline-none focus:border-clay"
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-line2 px-3.5 py-2 text-sm font-semibold text-navy transition hover:border-clay hover:text-clay"
                    >
                      {t("search")}
                    </button>
                  </form>
                  {searchEvent === ev.id && searchQ && (
                    <ul className="mt-2 space-y-1.5">
                      {candidates.length === 0 && (
                        <li className="text-sm text-muted">{t("noCandidates")}</li>
                      )}
                      {candidates.map((c) => (
                        <li key={c.id} className="flex items-center gap-2 text-sm">
                          <span className="min-w-0 flex-1 truncate text-navy">
                            {c.ime} {c.prezime}
                            <span className="text-xs text-muted">
                              {c.clubs?.naziv ? ` · ${c.clubs.naziv}` : ""}
                            </span>
                          </span>
                          <form action={addEntryAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="slug" value={slug} />
                            <input type="hidden" name="eventId" value={ev.id} />
                            <input type="hidden" name="playerId" value={c.id} />
                            <button
                              type="submit"
                              className="rounded-md bg-court px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-court-dark"
                            >
                              {t("addEntry")}
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              )}

              {draw && (
                <div className="mt-4">
                  <DrawBracket draw={draw} />
                </div>
              )}

              {/* Ručno doterivanje radnog žreba: zamena dve pozicije */}
              {swapSlotOptions.length > 0 && (
                <form
                  action={swapSlotsAction}
                  className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-line2 bg-bg2 p-3"
                >
                  <span className="text-sm font-semibold text-navy">{t("swapTitle")}</span>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="eventId" value={ev.id} />
                  <input type="hidden" name="drawId" value={draw!.id} />
                  {(["slotA", "slotB"] as const).map((name) => (
                    <select
                      key={name}
                      name={name}
                      required
                      className="min-w-0 flex-1 basis-44 rounded-lg border border-line2 bg-card px-2 py-2 text-sm outline-none focus:border-clay"
                    >
                      <option value="">{name === "slotA" ? t("swapA") : t("swapB")}</option>
                      {swapSlotOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ))}
                  <button
                    type="submit"
                    className="rounded-lg border border-line2 px-3.5 py-2 text-sm font-semibold text-navy transition hover:border-clay hover:text-clay"
                  >
                    {t("swapDo")}
                  </button>
                </form>
              )}

              {/* Satnica: termin + teren po meču */}
              {draw && (
                <details className="mt-4 rounded-xl border border-line2 bg-bg2 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-navy">
                    {t("scheduleTitle")}
                  </summary>
                  <div className="mt-3 space-y-2">
                    {draw.matches
                      .filter((m) => m.status !== "bye")
                      .map((m) => (
                        <form
                          key={m.id}
                          action={scheduleMatchAction}
                          className="flex flex-wrap items-center gap-2 text-sm"
                        >
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="eventId" value={ev.id} />
                          <input type="hidden" name="matchId" value={m.id} />
                          <span className="min-w-0 flex-1 basis-48 truncate text-navy">
                            {playerName(m.p1)} — {playerName(m.p2)}
                          </span>
                          <input
                            type="datetime-local"
                            name="termin"
                            defaultValue={isoToBelgradeInput(m.termin)}
                            className="rounded-lg border border-line2 bg-card px-2 py-1.5 text-sm outline-none focus:border-clay"
                          />
                          <input
                            type="text"
                            name="teren"
                            defaultValue={m.teren ?? ""}
                            placeholder={t("court")}
                            className="w-24 rounded-lg border border-line2 bg-card px-2 py-1.5 text-sm outline-none focus:border-clay"
                          />
                          <button
                            type="submit"
                            className="rounded-lg border border-line2 px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-clay hover:text-clay"
                          >
                            {t("scheduleSave")}
                          </button>
                        </form>
                      ))}
                  </div>
                </details>
              )}

              {draw && draw.status !== "radna" && playable.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-court-dark">
                    {t("enterResults")}
                  </h3>
                  <div className="space-y-2">
                    {playable.map((m) => (
                      <ResultForm
                        key={m.id}
                        m={m}
                        eventId={ev.id}
                        slug={slug}
                        locale={locale}
                        labels={{
                          p1: playerName(m.p1),
                          p2: playerName(m.p2),
                          placeholder: t("resultPlaceholder"),
                          save: t("saveResult"),
                          statuses: resultStatuses,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {tr.status === "zavrsen" ? (
        <p className="mt-8 rounded-2xl border border-court/30 bg-court/8 p-5 text-sm font-semibold text-court-dark">
          🏆 {t("finished")}
        </p>
      ) : (
        <section className="mt-8 rounded-2xl border border-clay/30 bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold text-navy">{t("finishTitle")}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate">{t("finishBody")}</p>
          {canFinish ? (
            <form action={finishTournamentAction} className="mt-4 flex flex-wrap items-center gap-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="tournamentId" value={tr.id} />
              <label className="flex items-center gap-2 text-sm text-navy">
                <input type="checkbox" name="potvrda" required className="accent-clay" />
                {t("finishConfirm")}
              </label>
              <button
                type="submit"
                className="rounded-xl bg-clay px-5 py-2.5 text-sm font-bold text-white transition hover:bg-clay-dark"
              >
                {t("finishButton")}
              </button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted">{t("finishBlocked")}</p>
          )}
        </section>
      )}
    </div>
  );
}
