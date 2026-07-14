import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRankings } from "@/lib/data/rankings";
import { Constants } from "@/lib/supabase/types";
import { PageHero } from "@/components/ui/page-hero";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "rankings" });
  return { title: t("title") };
}

const CATEGORIES = Constants.public.Enums.quality_category;
const DISCIPLINES = Constants.public.Enums.discipline;
const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default async function RangListePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const cats: readonly string[] = CATEGORIES;
  const discs: readonly string[] = DISCIPLINES;
  const kat = typeof sp.kat === "string" && cats.includes(sp.kat) ? sp.kat : "I";
  const disc = (typeof sp.disc === "string" && discs.includes(sp.disc) ? sp.disc : "singl") as (typeof DISCIPLINES)[number];

  const t = await getTranslations("rankings");
  const { week, rows } = await getRankings({ kategorija: kat, disciplina: disc });
  const hrefFor = (k: string, d: string) => `/rang-liste?kat=${k}&disc=${d}`;

  return (
    <>
      <PageHero
        compact
        crumb="/ rang-liste"
        eyebrow={week ? `${t("week")}: ${week}` : "Rang"}
        title={t("title")}
        lead={t("subtitle")}
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {/* Segmenti: disciplina + kategorija */}
        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap gap-1.5">
            {DISCIPLINES.map((d) => (
              <Link
                key={d}
                href={hrefFor(kat, d)}
                scroll={false}
                className={`rounded-lg px-3.5 py-2 text-sm font-bold transition ${
                  d === disc
                    ? "bg-navy text-white"
                    : "border border-line2 bg-card text-slate hover:border-clay hover:text-clay"
                }`}
              >
                {t(`disc.${d}`)}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <Link
                key={c}
                href={hrefFor(c, disc)}
                scroll={false}
                className={`grid h-9 w-9 place-items-center rounded-lg font-mono text-sm font-bold transition ${
                  c === kat
                    ? "bg-navy text-white"
                    : "border border-line2 bg-card text-slate hover:border-clay hover:text-clay"
                }`}
              >
                {c}
              </Link>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line2 bg-card p-10 text-center text-muted">
            {t("empty")}
          </div>
        ) : (
          <>
            {/* Desktop tabela */}
            <div className="hidden overflow-hidden rounded-2xl border border-line sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy text-left text-white">
                    <th className="px-4 py-3 text-center text-xs font-bold">{t("rank")}</th>
                    <th className="px-4 py-3 text-xs font-bold">{t("player")}</th>
                    <th className="px-4 py-3 text-right text-xs font-bold">{t("points")}</th>
                    <th className="px-4 py-3 text-right text-xs font-bold">{t("tournaments")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.players?.id ?? i} className={`border-t border-line ${i % 2 ? "bg-[#FBF8F3]" : "bg-card"}`}>
                      <td className="px-4 py-3 text-center font-mono text-base font-extrabold text-navy">
                        {MEDAL[r.mesto ?? 0] ?? r.mesto ?? i + 1}
                      </td>
                      <td className="px-4 py-3">
                        {r.players ? (
                          <Link href={`/igraci/${r.players.id}`} className="font-semibold text-navy hover:text-clay">
                            {r.players.ime} {r.players.prezime}
                          </Link>
                        ) : (
                          "—"
                        )}
                        {r.players?.clubs?.naziv && (
                          <span className="block text-xs text-muted">{r.players.clubs.naziv}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-court-dark">{r.bodovi}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate">{r.broj_turnira}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobilne kartice */}
            <ul className="space-y-2 sm:hidden">
              {rows.map((r, i) => (
                <li key={r.players?.id ?? i}>
                  <Link
                    href={r.players ? `/igraci/${r.players.id}` : "#"}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5 shadow-sm"
                  >
                    <span className="w-9 shrink-0 text-center font-mono text-lg font-extrabold text-navy">
                      {MEDAL[r.mesto ?? 0] ?? r.mesto ?? i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-navy">
                        {r.players?.ime} {r.players?.prezime}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {r.players?.clubs?.naziv ?? "—"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono font-bold text-court-dark">{r.bodovi}</span>
                      <span className="block text-xs text-muted">{r.broj_turnira} tur.</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
