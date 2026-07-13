import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "referee" });
  return { title: t("title") };
}

export default async function SudijaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("referee");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  let tournaments: {
    id: string;
    legacy_id: string | null;
    naziv: string;
    status: string;
    datum_od: string | null;
    datum_do: string | null;
    mesto: string | null;
  }[] = [];
  let isManager = false;
  let isStaff = false;

  if (claims) {
    const { data: staff } = await supabase.rpc("is_staff");
    isStaff = !!staff;
    const { data: profile } = await supabase
      .from("profiles")
      .select("player_id")
      .eq("id", claims.sub)
      .maybeSingle();

    if (staff || profile?.player_id) {
      let query = supabase
        .from("tournaments")
        .select("id, legacy_id, naziv, status, datum_od, datum_do, mesto")
        .order("datum_od", { ascending: true });
      if (!staff) query = query.eq("direktor_id", profile!.player_id!);
      const { data } = await query;
      tournaments = data ?? [];
      isManager = !!staff || tournaments.length > 0;
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="font-mono text-sm text-clay">/ sudija</span>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-navy sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-slate">{t("subtitle")}</p>
        {isStaff && (
          <Link
            href="/koordinator"
            className="mt-3 inline-block rounded-xl border border-line2 px-4 py-2 text-sm font-semibold text-navy transition hover:border-clay hover:text-clay"
          >
            🛠️ {t("coordinatorLink")}
          </Link>
        )}
      </header>

      {!claims ? (
        <div className="rounded-2xl border border-line bg-card p-6">
          <p className="text-sm leading-relaxed text-slate">{t("loginNeeded")}</p>
          <Link
            href="/prijava"
            className="mt-4 inline-block rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-dark"
          >
            {t("loginCta")}
          </Link>
        </div>
      ) : !isManager ? (
        <div className="rounded-2xl border border-dashed border-line2 bg-card p-6 text-sm leading-relaxed text-slate">
          {t("noTournaments")}
        </div>
      ) : (
        <ul className="space-y-3">
          {tournaments.map((tr) => (
            <li key={tr.id}>
              <Link
                href={`/sudija/${tr.legacy_id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm transition hover:border-line2 hover:shadow-[var(--shadow-tvs)]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-display font-bold text-navy">
                    {tr.naziv}
                  </span>
                  <span className="block text-xs text-muted">
                    {formatDateRange(tr.datum_od, tr.datum_do, locale)}
                    {tr.mesto ? ` · ${tr.mesto}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-clay">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
