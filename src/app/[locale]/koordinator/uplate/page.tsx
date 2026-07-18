import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/page-hero";
import { deletePaymentAction } from "../actions";
import { PaymentForm } from "./payment-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "coordinator" });
  return { title: t("payments.title") };
}

export default async function UplatePage({
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

  const { data: payments } = await supabase
    .from("payments")
    .select("id, tip, iznos, sezona, datum, napomena, players ( ime, prezime )")
    .order("created_at", { ascending: false })
    .limit(25);

  return (
    <>
      <PageHero compact crumb="/ koordinator / uplate" eyebrow="💰" title={t("payments.title")} lead={t("payments.lead")} />
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
          <h2 className="mb-3 font-display text-lg font-bold text-navy">{t("payments.new")}</h2>
          <PaymentForm
            locale={locale}
            labels={{
              player: t("payments.player"),
              hint: t("members.searchPlaceholder"),
              type: t("payments.type"),
              clanarina: t("payments.clanarina"),
              kotizacija: t("payments.kotizacija"),
              amount: t("payments.amount"),
              season: t("payments.season"),
              note: t("payments.note"),
              add: t("payments.add"),
            }}
          />
        </section>

        <section className="mt-6">
          <h2 className="mb-3 font-display text-lg font-bold text-navy">{t("payments.recent")}</h2>
          {(payments ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line2 bg-card p-5 text-sm text-muted">
              {t("payments.empty")}
            </p>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-line bg-card">
              {(payments ?? []).map((p, i) => (
                <li key={p.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm ${i % 2 ? "bg-[#FBF8F3]" : ""}`}>
                  <span className="min-w-0 flex-1 truncate font-semibold text-navy">
                    {p.players?.ime} {p.players?.prezime}
                  </span>
                  <span className="rounded-full bg-bg2 px-2 py-0.5 text-xs font-semibold text-slate">
                    {t(`payments.${p.tip}`)}
                  </span>
                  <span className="font-mono text-sm font-bold text-navy">
                    {Number(p.iznos).toLocaleString("sr-RS")}
                  </span>
                  <span className="text-xs text-muted">
                    {p.sezona} · {p.datum}
                    {p.napomena ? ` · ${p.napomena}` : ""}
                  </span>
                  <form action={deletePaymentAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="paymentId" value={p.id} />
                    <button type="submit" className="rounded-lg border border-line2 px-2 py-1 text-xs font-semibold text-slate transition hover:border-clay hover:text-clay" title={t("payments.delete")}>
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
