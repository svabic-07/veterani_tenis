import { setRequestLocale, getTranslations } from "next-intl/server";
import { createPublicClient } from "@/lib/supabase/public";
import { PageHero } from "@/components/ui/page-hero";

export const revalidate = 300;

function newsDate(ts: string, locale: string): string {
  return new Date(ts).toLocaleDateString(locale === "sr" ? "sr-RS" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "news" });
  return { title: t("title") };
}

export default async function VestiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("news");

  const supabase = createPublicClient();
  const { data: news } = await supabase
    .from("news")
    .select("id, naslov, sadrzaj, created_at")
    .eq("objavljena", true)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <>
      <PageHero compact crumb="/ vesti" eyebrow="📰" title={t("title")} lead={t("subtitle")} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {(news ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line2 bg-card p-6 text-sm text-muted">
            {t("empty")}
          </p>
        ) : (
          <div className="space-y-5">
            {(news ?? []).map((n) => (
              <article key={n.id} className="rounded-2xl border border-line bg-card p-6 shadow-sm">
                <time className="font-mono text-xs font-semibold uppercase tracking-wide text-clay">
                  {newsDate(n.created_at, locale)}
                </time>
                <h2 className="mt-1.5 font-display text-xl font-extrabold text-navy">{n.naslov}</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate">
                  {n.sadrzaj.split(/\n{2,}/).map((par, i) => (
                    // pojedinačni \n unutar pasusa (npr. auto-izveštaj) mora
                    // da ostane prelom reda
                    <p key={i} className="whitespace-pre-line">{par}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
