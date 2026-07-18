import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/page-hero";
import { formatDateRange } from "@/lib/format";
import {
  toggleRoleAction,
  resolveCategoryAction,
  setRefereeRoleAction,
  recalcRankingsAction,
} from "./actions";
import { NewTournamentForm } from "./new-tournament-form";
import { AssignRefereeForm } from "./assign-referee-form";

export const dynamic = "force-dynamic";

const ROLES = ["igrac", "sudija", "koordinator", "admin"] as const;
const SERIES = ["s2000", "s1000", "s500", "s250", "master"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "coordinator" });
  return { title: t("title") };
}

export default async function KoordinatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : "";
  const greska = typeof sp.greska === "string" ? sp.greska : "";
  const noviSlug = typeof sp.slug === "string" ? sp.slug : "";

  const t = await getTranslations("coordinator");
  const tc = await getTranslations("calendar");
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    redirect({ href: "/prijava", locale });
    return null;
  }
  const { data: staff } = await supabase.rpc("is_staff");
  if (!staff) {
    redirect({ href: "/", locale });
    return null;
  }
  const { data: isAdmin } = await supabase.rpc("is_admin");

  const [
    { data: users },
    { data: tournaments },
    { data: clubs },
    { data: audit },
    { data: catRequests },
    { data: refReports },
  ] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase
      .from("tournaments")
      .select(
        "id, legacy_id, naziv, serija, status, datum_od, datum_do, mesto, direktor_id, direktor_ime, direktor:players ( ime, prezime )",
      )
      .order("datum_od", { ascending: true }),
    supabase.from("clubs").select("id, naziv, grad").order("naziv"),
    supabase
      .from("audit_log")
      .select("id, action, entity, entity_id, created_at, actor")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("category_change_requests")
      .select(
        "id, player_id, trenutna_kat, trazena_kat, obrazlozenje, created_at, players ( ime, prezime )",
      )
      .eq("status", "na_cekanju")
      .order("created_at", { ascending: true }),
    supabase
      .from("referee_reports")
      .select(
        "id, loptice_dodeljeno, loptice_potroseno, sporne, napomena, updated_at, tournaments ( naziv, legacy_id )",
      )
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  const emailByUser = new Map((users ?? []).map((u) => [u.user_id, u.email]));

  return (
    <>
      <PageHero compact crumb="/ koordinator" eyebrow="🛠️" title={t("title")} lead={t("subtitle")} />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {ok && (
        <p className="mb-5 rounded-xl border border-court/30 bg-court/8 px-4 py-3 text-sm font-semibold text-court-dark">
          ✅ {t(`ok.${ok}`)}
          {ok === "turnir" && noviSlug && (
            <>
              {" "}
              <Link href={`/sudija/${noviSlug}`} className="underline">
                {t("openTournament")}
              </Link>
            </>
          )}
        </p>
      )}
      {greska && (
        <p className="mb-5 rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay-dark">
          {t(`err.${greska}`)}
        </p>
      )}

      {/* Novi turnir */}
      <section className="mb-8 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold text-navy">{t("newTournament")}</h2>
        <NewTournamentForm
          locale={locale}
          clubs={clubs ?? []}
          seriesOptions={SERIES.map((s) => ({ value: s, label: tc(`series.${s}`) }))}
          systemOptions={[
            { value: "kvalitativni", label: tc("system.kvalitativni") },
            { value: "starosni", label: tc("system.starosni") },
          ]}
          labels={{
            name: t("f.name"),
            series: t("f.series"),
            system: t("f.system"),
            club: t("f.club"),
            director: t("f.director"),
            directorHint: t("f.directorHint"),
            place: t("f.place"),
            host: t("f.host"),
            contact: t("f.contact"),
            location: t("f.location"),
            deadline: t("f.deadline"),
            from: t("f.from"),
            to: t("f.to"),
            create: t("create"),
          }}
        />
      </section>

      {/* Turniri + dodela sudije */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-navy">{t("tournaments")}</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/koordinator/klubovi"
              className="rounded-xl border border-line2 px-3 py-1.5 text-xs font-semibold text-slate transition hover:border-clay hover:text-clay"
            >
              {t("clubs.title")} →
            </Link>
            <Link
              href="/koordinator/clanovi"
              className="rounded-xl border border-line2 px-3 py-1.5 text-xs font-semibold text-slate transition hover:border-clay hover:text-clay"
            >
              {t("members.title")} →
            </Link>
            <Link
              href="/koordinator/uplate"
              className="rounded-xl border border-line2 px-3 py-1.5 text-xs font-semibold text-slate transition hover:border-clay hover:text-clay"
            >
              {t("payments.title")} →
            </Link>
            <Link
              href="/koordinator/vesti"
              className="rounded-xl border border-line2 px-3 py-1.5 text-xs font-semibold text-slate transition hover:border-clay hover:text-clay"
            >
              {t("newsAdmin.title")} →
            </Link>
            <Link
              href="/koordinator/bodovne-tablice"
              className="rounded-xl border border-line2 px-3 py-1.5 text-xs font-semibold text-slate transition hover:border-clay hover:text-clay"
            >
              {t("scoringTables")} →
            </Link>
          </div>
        </div>
        {(() => {
          // Particija po datumu: aktivni/predstojeći (i bez datuma — sveže kreirani)
          // na vrhu, najskoriji prvi; završeni u sklopivoj sekciji ispod.
          const today = new Date().toISOString().slice(0, 10);
          const endOf = (tr: NonNullable<typeof tournaments>[number]) =>
            tr.datum_do ?? tr.datum_od ?? "";
          const all = tournaments ?? [];
          const active = all
            .filter((tr) => endOf(tr) === "" || endOf(tr) >= today)
            .sort((a, b) => (a.datum_od ?? "").localeCompare(b.datum_od ?? ""));
          const finished = all
            .filter((tr) => endOf(tr) !== "" && endOf(tr) < today)
            .sort((a, b) => (b.datum_od ?? "").localeCompare(a.datum_od ?? ""));

          const row = (tr: (typeof all)[number], i: number) => {
            const refName =
              tr.direktor_ime ?? (tr.direktor ? `${tr.direktor.ime} ${tr.direktor.prezime}` : null);
            return (
              <li key={tr.id} className={`px-4 py-2.5 text-sm ${i % 2 ? "bg-[#FBF8F3]" : ""}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link
                    href={`/turnir/${tr.legacy_id}`}
                    className="min-w-0 flex-1 truncate font-semibold text-navy hover:text-clay"
                  >
                    {tr.naziv}
                  </Link>
                  <span className="text-xs text-muted">
                    {formatDateRange(tr.datum_od, tr.datum_do, locale)}
                    {tr.mesto ? ` · ${tr.mesto}` : ""}
                  </span>
                  <span className="rounded-full bg-bg2 px-2 py-0.5 text-xs font-semibold text-slate">
                    {tc(`status.${tr.status}`)}
                  </span>
                  <Link
                    href={`/sudija/${tr.legacy_id}`}
                    className="rounded-lg bg-navy px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-clay"
                  >
                    {t("manage")} →
                  </Link>
                </div>
                <AssignRefereeForm
                  turnirId={tr.id}
                  locale={locale}
                  currentName={refName}
                  labels={{ referee: t("referee"), assign: t("assign"), hint: t("f.directorHint") }}
                />
              </li>
            );
          };

          return (
            <>
              {active.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line2 bg-card p-5 text-sm text-muted">
                  {t("noActiveTournaments")}
                </p>
              ) : (
                <ul className="overflow-hidden rounded-2xl border border-line bg-card">
                  {active.map(row)}
                </ul>
              )}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate hover:text-clay">
                  {t("finishedTournaments", { n: finished.length })}
                </summary>
                <ul className="mt-2 overflow-hidden rounded-2xl border border-line bg-card">
                  {finished.map(row)}
                </ul>
              </details>
            </>
          );
        })()}
      </section>

      {/* Zahtevi za promenu kategorije */}
      <section className="mb-8">
        <h2 className="mb-1 font-display text-lg font-bold text-navy">{t("categoryRequests")}</h2>
        <p className="mb-3 text-sm text-muted">{t("categoryRequestsHint")}</p>
        {(catRequests ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line2 bg-card p-5 text-sm text-muted">
            {t("categoryRequestsEmpty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {(catRequests ?? []).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-card px-4 py-3 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy">
                    {r.players?.ime} {r.players?.prezime}
                  </span>
                  <span className="block text-xs text-slate">
                    {(r.trenutna_kat ?? "—") + " → " + r.trazena_kat}
                    {r.obrazlozenje ? ` · ${r.obrazlozenje}` : ""}
                  </span>
                </span>
                <div className="flex shrink-0 gap-2">
                  <form action={resolveCategoryAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="requestId" value={r.id} />
                    <input type="hidden" name="approve" value="1" />
                    <button
                      type="submit"
                      className="rounded-lg bg-court px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-court-dark"
                    >
                      {t("approve")}
                    </button>
                  </form>
                  <form action={resolveCategoryAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="requestId" value={r.id} />
                    <input type="hidden" name="approve" value="0" />
                    <button
                      type="submit"
                      className="rounded-lg border border-line2 px-3 py-1.5 text-xs font-semibold text-slate transition hover:border-clay hover:text-clay"
                    >
                      {t("reject")}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Korisnici i uloge */}
      <section className="mb-8">
        <h2 className="mb-1 font-display text-lg font-bold text-navy">{t("users")}</h2>
        <p className="mb-3 text-sm text-muted">{isAdmin ? t("usersHintAdmin") : t("usersHint")}</p>
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5">{t("th.user")}</th>
                <th className="px-4 py-2.5">{t("th.player")}</th>
                <th className="px-4 py-2.5">{t("th.roles")}</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.user_id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-medium text-navy">{u.email}</td>
                  <td className="px-4 py-2.5 text-slate">{u.player_ime ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {ROLES.map((role) => {
                        const has = u.roles.includes(role);
                        return isAdmin ? (
                          <form key={role} action={toggleRoleAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="userId" value={u.user_id} />
                            <input type="hidden" name="role" value={role} />
                            <input type="hidden" name="grant" value={has ? "0" : "1"} />
                            <button
                              type="submit"
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                                has
                                  ? "bg-court text-white hover:bg-court-dark"
                                  : "border border-line2 text-muted hover:border-clay hover:text-clay"
                              }`}
                              title={has ? t("revokeRole") : t("grantRole")}
                            >
                              {role}
                            </button>
                          </form>
                        ) : role === "sudija" ? (
                          // Koordinator (sekretar) sme da dodeli/oduzme sudijsku ulogu
                          <form key={role} action={setRefereeRoleAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="userId" value={u.user_id} />
                            <input type="hidden" name="grant" value={has ? "0" : "1"} />
                            <button
                              type="submit"
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                                has
                                  ? "bg-court text-white hover:bg-court-dark"
                                  : "border border-line2 text-muted hover:border-clay hover:text-clay"
                              }`}
                              title={has ? t("revokeRole") : t("grantRole")}
                            >
                              {role}
                            </button>
                          </form>
                        ) : (
                          has && (
                            <span
                              key={role}
                              className="rounded-full bg-court/12 px-2.5 py-1 text-xs font-semibold text-court-dark"
                            >
                              {role}
                            </span>
                          )
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rang liste */}
      <section className="mb-8 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold text-navy">{t("rankingsTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("rankingsHint")}</p>
        <form action={recalcRankingsAction} className="mt-3">
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="rounded-xl border border-line2 px-4 py-2 text-sm font-semibold text-navy transition hover:border-navy"
          >
            {t("recalcRankings")}
          </button>
        </form>
      </section>

      {/* Izveštaji sudija (loptice, sporne situacije) */}
      {(refReports ?? []).length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-bold text-navy">🎾 {t("refReports")}</h2>
          <ul className="overflow-hidden rounded-2xl border border-line bg-card">
            {(refReports ?? []).map((r, i) => (
              <li key={r.id} className={`px-4 py-3 text-sm ${i % 2 ? "bg-[#FBF8F3]" : ""}`}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link
                    href={`/sudija/${r.tournaments?.legacy_id ?? ""}#izvestaj`}
                    className="font-semibold text-navy underline-offset-2 hover:underline"
                  >
                    {r.tournaments?.naziv ?? "—"}
                  </Link>
                  <span className="text-xs text-muted">
                    {t("refBalls")}: {r.loptice_dodeljeno ?? "—"} / {r.loptice_potroseno ?? "—"}
                  </span>
                </div>
                {r.sporne && (
                  <p className="mt-1 text-xs text-clay-dark">⚠️ {r.sporne}</p>
                )}
                {r.napomena && <p className="mt-1 text-xs text-slate">{r.napomena}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Audit log */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-navy">{t("audit")}</h2>
        {(audit ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line2 bg-card p-5 text-sm text-muted">
            {t("auditEmpty")}
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-line bg-card">
            {(audit ?? []).map((a, i) => (
              <li
                key={a.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm ${
                  i % 2 ? "bg-[#FBF8F3]" : ""
                }`}
              >
                <span className="font-mono text-xs text-muted">
                  {new Intl.DateTimeFormat(locale === "sr" ? "sr-Latn-RS" : "en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Europe/Belgrade",
                  }).format(new Date(a.created_at))}
                </span>
                <span className="font-semibold text-navy">{a.action}</span>
                <span className="text-xs text-muted">{a.entity}</span>
                <span className="ml-auto text-xs text-slate">
                  {emailByUser.get(a.actor ?? "") ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </>
  );
}
