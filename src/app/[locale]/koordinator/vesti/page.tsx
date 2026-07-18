import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/page-hero";
import { addNewsAction, toggleNewsAction } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "coordinator" });
  return { title: t("newsAdmin.title") };
}

export default async function VestiAdminPage({
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

  const t = await getTranslations("coordinator");
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

  const { data: news } = await supabase
    .from("news")
    .select("id, naslov, objavljena, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <>
      <PageHero compact crumb="/ koordinator / vesti" eyebrow="📰" title={t("newsAdmin.title")} lead={t("newsAdmin.lead")} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/koordinator" className="text-sm font-semibold text-clay hover:text-clay-dark">
          ← {t("backToPanel")}
        </Link>

        {ok && (
          <p className="mt-5 rounded-xl border border-court/30 bg-court/8 px-4 py-3 text-sm font-semibold text-court-dark">
            ✅ {t(`ok.${ok}`)}
          </p>
        )}
        {greska && (
          <p className="mt-5 rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay-dark">{t(`err.${greska}`)}</p>
        )}

        <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
          <h2 className="mb-3 font-display text-lg font-bold text-navy">{t("newsAdmin.new")}</h2>
          <form action={addNewsAction} className="space-y-3">
            <input type="hidden" name="locale" value={locale} />
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-navy">{t("newsAdmin.headline")}</span>
              <input type="text" name="naslov" required minLength={3} className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-navy">{t("newsAdmin.body")}</span>
              <textarea name="sadrzaj" required rows={6} className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay" />
            </label>
            <button type="submit" className="rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-dark">
              {t("newsAdmin.publish")}
            </button>
          </form>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 font-display text-lg font-bold text-navy">{t("newsAdmin.list")}</h2>
          {(news ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line2 bg-card p-5 text-sm text-muted">
              {t("newsAdmin.empty")}
            </p>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-line bg-card">
              {(news ?? []).map((n, i) => (
                <li key={n.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm ${i % 2 ? "bg-[#FBF8F3]" : ""}`}>
                  <span className="min-w-0 flex-1 truncate font-semibold text-navy">{n.naslov}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${n.objavljena ? "bg-court/12 text-court-dark" : "bg-bg2 text-muted"}`}>
                    {n.objavljena ? t("newsAdmin.published") : t("newsAdmin.hidden")}
                  </span>
                  <form action={toggleNewsAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="newsId" value={n.id} />
                    <input type="hidden" name="mode" value={n.objavljena ? "sakrij" : "objavi"} />
                    <button type="submit" className="rounded-lg border border-line2 px-2 py-1 text-xs font-semibold text-slate transition hover:border-clay hover:text-clay">
                      {n.objavljena ? t("newsAdmin.hide") : t("newsAdmin.show")}
                    </button>
                  </form>
                  <form action={toggleNewsAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="newsId" value={n.id} />
                    <input type="hidden" name="mode" value="obrisi" />
                    <button type="submit" className="rounded-lg border border-line2 px-2 py-1 text-xs font-semibold text-slate transition hover:border-clay hover:text-clay" title={t("newsAdmin.delete")}>
                      ✕
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
