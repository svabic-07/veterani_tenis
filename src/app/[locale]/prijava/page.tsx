import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/page-hero";
import { sendLoginLink, passwordLogin } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("title") };
}

export default async function PrijavaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const poslato = typeof sp.poslato === "string" ? sp.poslato : "";
  const greska = typeof sp.greska === "string" ? sp.greska : "";

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    redirect({ href: "/nalog", locale });
  }

  const t = await getTranslations("auth");

  return (
    <>
      <PageHero
        compact
        crumb="/ prijava"
        eyebrow={locale === "sr" ? "Bez lozinke" : "Passwordless"}
        title={t("title")}
        lead={t("intro")}
      />
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      {poslato ? (
        <div className="rounded-2xl border border-court/30 bg-court/8 p-6">
          <p className="font-display text-lg font-bold text-court-dark">📬 {t("sentTitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate">
            {t("sentBody", { email: poslato })}
          </p>
          <p className="mt-3 text-xs text-muted">{t("sentHint")}</p>
        </div>
      ) : (
        <form action={sendLoginLink} className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <input type="hidden" name="locale" value={locale} />
          <label htmlFor="email" className="block text-sm font-semibold text-navy">
            {t("emailLabel")}
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder={t("emailPlaceholder")}
            className="mt-2 w-full rounded-xl border border-line2 bg-bg px-4 py-3 text-base outline-none focus:border-clay"
          />
          {greska && (
            <p className="mt-3 rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay-dark">
              {greska === "email" && t("errorEmail")}
              {greska === "limit" && t("errorLimit")}
              {greska === "slanje" && t("errorSend")}
              {greska === "link" && t("errorLink")}
            </p>
          )}
          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-clay px-5 py-3 text-base font-semibold text-white transition hover:bg-clay-dark"
          >
            {t("submit")}
          </button>
          <p className="mt-4 text-xs leading-relaxed text-muted">{t("noPassword")}</p>
        </form>
      )}

      <form action={passwordLogin} className="mt-6 rounded-2xl border border-line bg-card p-6 shadow-sm">
        <input type="hidden" name="locale" value={locale} />
        <p className="font-display text-lg font-bold text-navy">{t("passwordTitle")}</p>
        <p className="mt-1.5 text-sm text-slate">{t("passwordBody")}</p>
        <label htmlFor="pw-email" className="mt-4 block text-sm font-semibold text-navy">
          {t("emailLabel")}
        </label>
        <input
          id="pw-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder={t("emailPlaceholder")}
          className="mt-2 w-full rounded-xl border border-line2 bg-bg px-4 py-3 text-base outline-none focus:border-clay"
        />
        <label htmlFor="pw-password" className="mt-3 block text-sm font-semibold text-navy">
          {t("passwordLabel")}
        </label>
        <input
          id="pw-password"
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mt-2 w-full rounded-xl border border-line2 bg-bg px-4 py-3 text-base outline-none focus:border-clay"
        />
        {greska === "lozinka" && (
          <p className="mt-3 rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay-dark">{t("errorPassword")}</p>
        )}
        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-navy px-5 py-3 text-base font-semibold text-white transition hover:bg-navy/90"
        >
          {t("passwordSubmit")}
        </button>
      </form>

      <div className="mt-8 rounded-2xl border border-line bg-card p-5 text-sm text-slate">
        <p className="font-semibold text-navy">{t("helpTitle")}</p>
        <p className="mt-1.5 leading-relaxed">{t("helpBody")}</p>
        <p className="mt-3">
          <Link href="/uclanjenje" className="font-semibold text-clay underline-offset-2 hover:underline">
            {t("joinCta")} →
          </Link>
        </p>
      </div>
      </div>
    </>
  );
}
