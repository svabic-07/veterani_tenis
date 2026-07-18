import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/page-hero";
import { addClubAction, updateClubCityAction } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "coordinator" });
  return { title: t("clubs.title") };
}

export default async function KluboviPage({
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
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";

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

  let query = supabase.from("clubs").select("id, naziv, grad").order("naziv").limit(30);
  if (q) query = query.ilike("naziv", `%${q}%`);
  const { data: clubs } = await query;

  return (
    <>
      <PageHero compact crumb="/ koordinator / klubovi" eyebrow="🏟️" title={t("clubs.title")} lead={t("clubs.lead")} />
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

        {/* Novi klub */}
        <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold text-navy">{t("clubs.new")}</h2>
          <form action={addClubAction} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="locale" value={locale} />
            <label className="min-w-0 flex-1 basis-56 text-sm">
              <span className="mb-1 block font-semibold text-navy">{t("clubs.name")}</span>
              <input type="text" name="naziv" required minLength={2} className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay" />
            </label>
            <label className="basis-44 text-sm">
              <span className="mb-1 block font-semibold text-navy">{t("clubs.city")}</span>
              <input type="text" name="grad" className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay" />
            </label>
            <button type="submit" className="rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-dark">
              {t("clubs.add")}
            </button>
          </form>
          <p className="mt-2 text-xs text-muted">{t("clubs.cityHint")}</p>
        </section>

        {/* Pretraga + lista */}
        <section className="mt-6">
          <form method="get" className="mb-3 flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder={t("clubs.searchPlaceholder")}
              className="w-full rounded-xl border border-line2 bg-card px-3 py-2.5 text-sm outline-none focus:border-clay"
            />
            <button type="submit" className="rounded-xl border border-line2 px-4 py-2 text-sm font-semibold text-slate transition hover:border-clay hover:text-clay">
              {t("clubs.search")}
            </button>
          </form>
          <ul className="overflow-hidden rounded-2xl border border-line bg-card">
            {(clubs ?? []).map((c, i) => (
              <li key={c.id} className={`flex flex-wrap items-center gap-2 px-4 py-2 text-sm ${i % 2 ? "bg-[#FBF8F3]" : ""}`}>
                <span className="min-w-0 flex-1 truncate font-semibold text-navy">{c.naziv}</span>
                <form action={updateClubCityAction} className="flex items-center gap-1.5">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="klubId" value={c.id} />
                  <input type="hidden" name="q" value={q} />
                  <input
                    type="text"
                    name="grad"
                    defaultValue={c.grad ?? ""}
                    placeholder={t("clubs.city")}
                    className="w-32 rounded-lg border border-line2 bg-bg px-2 py-1 text-xs outline-none focus:border-clay"
                  />
                  <button type="submit" className="rounded-lg border border-line2 px-2 py-1 text-xs font-semibold text-slate transition hover:border-clay hover:text-clay">
                    ✓
                  </button>
                </form>
              </li>
            ))}
          </ul>
          {(clubs ?? []).length === 30 && <p className="mt-2 text-xs text-muted">{t("clubs.more")}</p>}
        </section>
      </div>
    </>
  );
}
