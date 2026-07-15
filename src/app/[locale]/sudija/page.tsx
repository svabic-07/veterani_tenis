import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/page-hero";
import { Pill, TOURNAMENT_STATUS_TONE } from "@/components/ui/pill";
import { statusByDate } from "@/lib/tournament-status";
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
  const tc = await getTranslations("calendar");

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
        .order("datum_od", { ascending: false, nullsFirst: false });
      if (!staff) query = query.eq("direktor_id", profile!.player_id!);
      const { data } = await query;
      tournaments = data ?? [];
      isManager = !!staff || tournaments.length > 0;
    }
  }

  // Grupisanje po godinama (najnovija prva), u okviru godine najnoviji prvi.
  // Uvezena istorija je sva `zavrsen`, pa se status računa iz datuma.
  const byYear = new Map<string, typeof tournaments>();
  for (const tr of tournaments) {
    const year = (tr.datum_od ?? tr.datum_do ?? "").slice(0, 4) || "—";
    const list = byYear.get(year) ?? [];
    list.push(tr);
    byYear.set(year, list);
  }
  const years = [...byYear.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <>
      <PageHero compact crumb="/ sudija" eyebrow="⚖️" title={t("title")} lead={t("subtitle")}>
        {isStaff && (
          <Link
            href="/koordinator"
            className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            🛠️ {t("coordinatorLink")}
          </Link>
        )}
      </PageHero>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
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
        <div className="space-y-9">
          {years.map((year) => (
            <section key={year}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-mono text-lg font-extrabold text-navy">{year}</h2>
                <span className="text-xs font-semibold text-muted">
                  {t("tournamentsCount", { n: byYear.get(year)!.length })}
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <ul className="space-y-3">
                {byYear.get(year)!.map((tr) => {
                  const st = statusByDate(tr.datum_od, tr.datum_do);
                  return (
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
                        <span className="flex shrink-0 items-center gap-3">
                          <Pill tone={TOURNAMENT_STATUS_TONE[st]} live={st === "u_toku"}>
                            {tc(`status.${st}`)}
                          </Pill>
                          <span className="text-sm font-semibold text-clay">→</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      </div>
    </>
  );
}
