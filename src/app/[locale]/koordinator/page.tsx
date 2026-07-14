import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/page-hero";
import { formatDateRange } from "@/lib/format";
import { toggleRoleAction, createTournamentAction } from "./actions";

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

  const [{ data: users }, { data: tournaments }, { data: clubs }, { data: audit }] =
    await Promise.all([
      supabase.rpc("admin_list_users"),
      supabase
        .from("tournaments")
        .select("id, legacy_id, naziv, serija, status, datum_od, datum_do, mesto")
        .order("datum_od", { ascending: true }),
      supabase.from("clubs").select("id, naziv").order("naziv"),
      supabase
        .from("audit_log")
        .select("id, action, entity, entity_id, created_at, actor")
        .order("created_at", { ascending: false })
        .limit(15),
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
        <form action={createTournamentAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-semibold text-navy">{t("f.name")}</span>
            <input
              type="text"
              name="naziv"
              required
              minLength={3}
              className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-navy">{t("f.series")}</span>
            <select
              name="serija"
              defaultValue="s1000"
              className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay"
            >
              {SERIES.map((s) => (
                <option key={s} value={s}>
                  {tc(`series.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-navy">{t("f.system")}</span>
            <select
              name="sistem"
              defaultValue="kvalitativni"
              className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay"
            >
              <option value="kvalitativni">{tc("system.kvalitativni")}</option>
              <option value="starosni">{tc("system.starosni")}</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-navy">{t("f.club")}</span>
            <select
              name="klubId"
              defaultValue=""
              className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay"
            >
              <option value="">—</option>
              {(clubs ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.naziv}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-navy">{t("f.director")}</span>
            <input
              type="text"
              name="direktorIme"
              placeholder={t("f.directorHint")}
              className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-navy">{t("f.place")}</span>
            <input
              type="text"
              name="mesto"
              className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-navy">{t("f.deadline")}</span>
            <input
              type="datetime-local"
              name="rok"
              className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-navy">{t("f.from")}</span>
            <input
              type="date"
              name="datumOd"
              className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-navy">{t("f.to")}</span>
            <input
              type="date"
              name="datumDo"
              className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-dark"
            >
              {t("create")}
            </button>
          </div>
        </form>
      </section>

      {/* Turniri */}
      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-bold text-navy">{t("tournaments")}</h2>
        <ul className="overflow-hidden rounded-2xl border border-line bg-card">
          {(tournaments ?? []).map((tr, i) => (
            <li
              key={tr.id}
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm ${
                i % 2 ? "bg-[#FBF8F3]" : ""
              }`}
            >
              <Link
                href={`/sudija/${tr.legacy_id}`}
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
            </li>
          ))}
        </ul>
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
