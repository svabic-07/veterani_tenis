import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/page-hero";
import { claimPlayer, signOut } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("title") };
}

export default async function NalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const greska = typeof sp.greska === "string" ? sp.greska : "";
  const povezan = sp.povezan === "1";

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims) {
    redirect({ href: "/prijava", locale });
    return null;
  }
  const email = typeof claims.email === "string" ? claims.email : "";

  const t = await getTranslations("account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("player_id, full_name")
    .eq("id", claims.sub)
    .maybeSingle();

  // Povezani igrač (ako postoji)
  const { data: player } = profile?.player_id
    ? await supabase
        .from("players")
        .select("id, ime, prezime, godiste, kategorija, clubs ( naziv )")
        .eq("id", profile.player_id)
        .maybeSingle()
    : { data: null };

  // Kandidati za povezivanje (po email-u naloga)
  const { data: candidates } = player
    ? { data: [] }
    : await supabase.rpc("my_player_candidates");

  return (
    <>
      <PageHero compact crumb="/ nalog" eyebrow={email} title={t("title")} />
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      {povezan && (
        <p className="mb-5 rounded-xl border border-court/30 bg-court/8 px-4 py-3 text-sm font-semibold text-court-dark">
          ✅ {t("linkedSuccess")}
        </p>
      )}
      {greska && (
        <p className="mb-5 rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay-dark">
          {greska === "zauzet" ? t("errorTaken") : t("errorClaim")}
        </p>
      )}

      {player ? (
        <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("linkedPlayer")}
          </p>
          <p className="mt-2 font-display text-xl font-bold text-navy">
            {player.ime} {player.prezime}
          </p>
          <p className="mt-1 text-sm text-slate">
            {player.clubs?.naziv ?? "—"}
            {player.godiste ? ` · ${player.godiste}.` : ""}
            {player.kategorija ? ` · ${t("category")} ${player.kategorija}` : ""}
          </p>
          <Link
            href={`/igraci/${player.id}`}
            className="mt-4 inline-block rounded-xl border border-line2 px-4 py-2 text-sm font-semibold text-navy transition hover:border-clay hover:text-clay"
          >
            {t("viewProfile")}
          </Link>
        </div>
      ) : (candidates ?? []).length > 0 ? (
        <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <p className="font-display text-lg font-bold text-navy">{t("pickTitle")}</p>
          <p className="mt-1.5 text-sm text-slate">{t("pickBody")}</p>
          <ul className="mt-4 space-y-2">
            {(candidates ?? []).map((c) => (
              <li key={c.player_id}>
                <form action={claimPlayer} className="flex items-center gap-3 rounded-xl border border-line2 p-3">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="playerId" value={c.player_id} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-navy">
                      {c.ime} {c.prezime}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {c.klub ?? "—"}
                      {c.godiste ? ` · ${c.godiste}.` : ""}
                    </span>
                  </span>
                  {c.zauzet ? (
                    <span className="shrink-0 text-xs text-muted">{t("taken")}</span>
                  ) : (
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg bg-court px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-court-dark"
                    >
                      {t("thisIsMe")}
                    </button>
                  )}
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line2 bg-card p-6 text-sm leading-relaxed text-slate">
          <p className="font-semibold text-navy">{t("noMatchTitle")}</p>
          <p className="mt-1.5">{t("noMatchBody")}</p>
        </div>
      )}

      <form action={signOut} className="mt-8">
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="rounded-xl border border-line2 px-4 py-2 text-sm font-semibold text-slate transition hover:border-clay hover:text-clay"
        >
          {t("signOut")}
        </button>
      </form>
      </div>
    </>
  );
}
