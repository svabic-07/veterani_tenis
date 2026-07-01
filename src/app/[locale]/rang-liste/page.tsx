import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRankings } from "@/lib/data/rankings";
import { Constants } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const CATEGORIES = Constants.public.Enums.quality_category;
const DISCIPLINES = Constants.public.Enums.discipline;

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
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="mb-6">
        <span className="font-mono text-sm text-clay">/ rang-liste</span>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-navy sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-slate">{t("subtitle")}</p>
      </header>

      {/* Disciplina */}
      <div className="mb-3 flex flex-wrap gap-2">
        {DISCIPLINES.map((d) => (
          <Link
            key={d}
            href={hrefFor(kat, d)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              d === disc ? "bg-clay text-white" : "border border-line2 bg-card text-slate hover:border-clay-soft"
            }`}
          >
            {t(`disc.${d}`)}
          </Link>
        ))}
      </div>

      {/* Kategorija */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={hrefFor(c, disc)}
            className={`grid h-9 w-9 place-items-center rounded-lg font-display text-sm font-bold transition ${
              c === kat ? "bg-navy text-white" : "border border-line2 bg-card text-slate hover:border-clay-soft"
            }`}
          >
            {c}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line2 bg-card p-10 text-center text-muted">
          {t("empty")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-left text-white">
                <th className="px-4 py-2.5 text-center font-semibold">{t("rank")}</th>
                <th className="px-4 py-2.5 font-semibold">{t("player")}</th>
                <th className="px-4 py-2.5 text-right font-semibold">{t("points")}</th>
                <th className="px-4 py-2.5 text-right font-semibold">{t("tournaments")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.players?.id ?? i} className={i % 2 ? "bg-[#FBF8F3]" : "bg-card"}>
                  <td className="px-4 py-3 text-center font-mono font-bold text-clay-dark">{r.mesto ?? i + 1}</td>
                  <td className="px-4 py-3">
                    {r.players ? (
                      <Link href={`/igraci/${r.players.id}`} className="font-medium text-navy hover:underline">
                        {r.players.ime} {r.players.prezime}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {r.players?.clubs?.naziv ? (
                      <span className="block text-xs text-muted">{r.players.clubs.naziv}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-ink">{r.bodovi}</td>
                  <td className="px-4 py-3 text-right text-slate">{r.broj_turnira}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {week ? (
        <p className="mt-3 text-xs text-muted">
          {t("week")}: {week}
        </p>
      ) : null}
    </div>
  );
}
