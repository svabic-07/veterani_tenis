import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/page-hero";
import { updateScoringTableAction } from "./actions";

export const dynamic = "force-dynamic";

const SERIES = ["s2000", "s1000", "s500", "s250"] as const;
const SERIES_B = ["s2000", "s1000", "s500", "s250", "master"] as const;
const KOSTURI = [8, 16, 32, 64, 128] as const;
const KOLA = [
  "pobednik",
  "finale",
  "polufinale",
  "cetvrtfinale",
  "osmina",
  "sesnaestina",
  "tridesetdvojina",
  "sezdesetcetvrtina",
  "utesni",
] as const;
const KOLA_B = [
  "pobednik",
  "finale",
  "polufinale",
  "pobeda_u_grupi",
  "bez_pobede",
  "rezerva",
] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "coordinator" });
  return { title: t("scoringTables") };
}

export default async function BodovneTablicePage({
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
  const model = sp.model === "svi_boduju" ? "svi_boduju" : "klasicni";
  const kosturRaw = typeof sp.kostur === "string" ? Number(sp.kostur) : 32;
  const kostur =
    model === "svi_boduju"
      ? 8
      : (KOSTURI as readonly number[]).includes(kosturRaw)
        ? kosturRaw
        : 32;

  const t = await getTranslations("coordinator");
  const tc = await getTranslations("calendar");
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

  const { data: rows } = await supabase
    .from("scoring_tables")
    .select("id, serija, kolo, bodovi")
    .eq("model", model)
    .eq("kostur", kostur);

  // mapa (serija|kolo) → { id, bodovi }; koje kolone (kola) postoje za ovaj kostur
  const byKey = new Map<string, { id: string; bodovi: number }>();
  const presentKola = new Set<string>();
  for (const r of rows ?? []) {
    byKey.set(`${r.serija}|${r.kolo}`, { id: r.id, bodovi: r.bodovi });
    presentKola.add(r.kolo);
  }
  const kolaCols = (model === "svi_boduju" ? KOLA_B : KOLA).filter((k) => presentKola.has(k));
  const seriesRows = model === "svi_boduju" ? SERIES_B : SERIES;

  return (
    <>
      <PageHero compact crumb="/ koordinator / bodovne tablice" eyebrow="📊" title={t("scoringTables")} lead={t("scoringTablesLead")} />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
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

        {/* Izbor modela */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {(
            [
              ["klasicni", t("modelKlasicni")],
              ["svi_boduju", t("modelSviBoduju")],
            ] as const
          ).map(([m, label]) => (
            <Link
              key={m}
              href={`/koordinator/bodovne-tablice?model=${m}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                m === model
                  ? "bg-navy text-white"
                  : "border border-line2 text-slate hover:border-navy hover:text-navy"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Izbor kostura (samo klasični — Model B ne zavisi od kostura) */}
        {model === "klasicni" && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-muted">{t("skeleton")}:</span>
            {KOSTURI.map((k) => (
              <Link
                key={k}
                href={`/koordinator/bodovne-tablice?kostur=${k}`}
                className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                  k === kostur
                    ? "bg-clay text-white"
                    : "border border-line2 text-slate hover:border-clay hover:text-clay"
                }`}
              >
                {k}
              </Link>
            ))}
          </div>
        )}

        <p className="mt-3 text-sm text-muted">
          {model === "svi_boduju" ? t("scoringModelSviBoduju") : t("scoringModelKlasicni")}
        </p>

        <form action={updateScoringTableAction} className="mt-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="kostur" value={kostur} />
          <input type="hidden" name="model" value={model} />
          <div className="overflow-x-auto rounded-2xl border border-line bg-card">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5">{t("series")}</th>
                  {kolaCols.map((k) => (
                    <th key={k} className="px-3 py-2.5 text-center">
                      {t(`kolo.${k}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seriesRows.map((s) => (
                  <tr key={s} className="border-b border-line last:border-0">
                    <td className="px-4 py-2 font-semibold text-navy">{tc(`series.${s}`)}</td>
                    {kolaCols.map((k) => {
                      const cell = byKey.get(`${s}|${k}`);
                      return (
                        <td key={k} className="px-3 py-2 text-center">
                          {cell ? (
                            <input
                              type="number"
                              min={0}
                              step={1}
                              name={`b_${cell.id}`}
                              defaultValue={cell.bodovi}
                              className="w-20 rounded-lg border border-line2 bg-bg px-2 py-1 text-center outline-none focus:border-clay"
                            />
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="submit"
            className="mt-5 rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-dark"
          >
            {t("save")}
          </button>
        </form>
      </div>
    </>
  );
}
