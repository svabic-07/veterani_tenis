import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/page-hero";
import { addPlayerAction } from "../actions";
import { CopyEmails } from "./copy-emails";

export const dynamic = "force-dynamic";

const KATEGORIJE = ["I", "II", "III", "IV", "V"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "coordinator" });
  return { title: t("members.title") };
}

export default async function ClanoviPage({
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

  const [{ data: clubs }, { data: privateRows }] = await Promise.all([
    supabase.from("clubs").select("id, naziv").order("naziv"),
    supabase.from("player_private").select("email").not("email", "is", null),
  ]);
  const emails = [
    ...new Set(
      (privateRows ?? [])
        .map((r) => (r.email ?? "").trim().toLowerCase())
        .filter((e) => e.includes("@")),
    ),
  ].join(",");

  return (
    <>
      <PageHero compact crumb="/ koordinator / članovi" eyebrow="👥" title={t("members.title")} lead={t("members.lead")} />
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

        {/* Novi igrač / gost */}
        <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold text-navy">{t("members.new")}</h2>
          <p className="mt-1 text-sm text-muted">{t("members.newHint")}</p>
          <form action={addPlayerAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="locale" value={locale} />
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-navy">{t("members.firstName")}</span>
              <input type="text" name="ime" required minLength={2} className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-navy">{t("members.lastName")}</span>
              <input type="text" name="prezime" required minLength={2} className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-navy">{t("members.birthYear")}</span>
              <input type="text" name="godiste" inputMode="numeric" placeholder="1975" className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-navy">{t("members.club")}</span>
              <select name="klubId" defaultValue="" className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay">
                <option value="">—</option>
                {(clubs ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.naziv}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-navy">{t("members.category")}</span>
              <select name="kategorija" defaultValue="" className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay">
                <option value="">—</option>
                {KATEGORIJE.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-navy">
              <input type="checkbox" name="gost" value="1" className="accent-clay" />
              {t("members.guest")}
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-dark">
                {t("members.add")}
              </button>
            </div>
          </form>
        </section>

        {/* Email svim članovima */}
        <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold text-navy">{t("members.emailTitle")}</h2>
          <p className="mb-3 mt-1 text-sm text-muted">{t("members.emailHint")}</p>
          <CopyEmails
            emails={emails}
            labels={{ copy: t("members.copyEmails"), copied: t("members.copied"), show: t("members.showEmails") }}
          />
        </section>
      </div>
    </>
  );
}
