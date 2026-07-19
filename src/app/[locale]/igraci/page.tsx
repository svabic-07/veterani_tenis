import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { searchPlayers } from "@/lib/data/players";
import { Constants } from "@/lib/supabase/types";
import { PageHero } from "@/components/ui/page-hero";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "players" });
  return { title: t("title") };
}

const CATEGORIES = Constants.public.Enums.quality_category;

export default async function IgraciPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const catList: readonly string[] = CATEGORIES;
  const kategorija =
    typeof sp.kategorija === "string" && catList.includes(sp.kategorija) ? sp.kategorija : "";

  const strana = Math.max(1, Number(typeof sp.strana === "string" ? sp.strana : "1") || 1);
  const t = await getTranslations("players");
  const { players, count } = await searchPlayers({ q, kategorija, page: strana });
  const PO_STRANI = 60;
  const ukupnoStrana = Math.max(1, Math.ceil(count / PO_STRANI));
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (kategorija) params.set("kategorija", kategorija);
    if (n > 1) params.set("strana", String(n));
    const qs = params.toString();
    return `/igraci${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHero
        compact
        crumb="/ igrači"
        eyebrow="Direktorijum"
        title={t("title")}
        lead={t("subtitle")}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Pretraga */}
        <form className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-line bg-card p-2 shadow-sm">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
            <Icon name="search" size={16} className="shrink-0 text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t("searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
            />
          </div>
          <select
            name="kategorija"
            defaultValue={kategorija}
            className="rounded-xl border border-line2 bg-bg px-3 py-2 text-sm outline-none focus:border-clay"
          >
            <option value="">{t("allCategories")}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t("category")} {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl bg-clay px-5 py-2 text-sm font-semibold text-white transition hover:bg-clay-dark"
          >
            {t("search")}
          </button>
        </form>

        <p className="mb-5 text-sm font-semibold text-muted">
          {t("count", { n: count })}
          {ukupnoStrana > 1 && (
            <span className="ml-2 font-normal">
              {t("pageOf", { page: strana, total: ukupnoStrana })}
            </span>
          )}
        </p>

        {players.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line2 bg-card p-10 text-center text-muted">
            {t("empty")}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/igraci/${p.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-line2 hover:shadow-[var(--shadow-tvs)]"
                >
                  <Avatar ime={p.ime} prezime={p.prezime} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-navy">
                      {p.ime} {p.prezime}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {p.clubs?.naziv ?? "—"}
                      {p.drzava && p.drzava !== "RS" ? ` · ${p.drzava}` : ""}
                    </span>
                  </span>
                  {p.kategorija && (
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-bg2 font-mono text-xs font-bold text-slate">
                      {p.kategorija}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {ukupnoStrana > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-3">
            {strana > 1 && (
              <Link
                href={pageHref(strana - 1)}
                className="rounded-xl border border-line2 bg-card px-4 py-2 text-sm font-semibold text-navy transition hover:border-clay hover:text-clay"
              >
                ← {t("prevPage")}
              </Link>
            )}
            <span className="font-mono text-sm text-muted">
              {strana} / {ukupnoStrana}
            </span>
            {strana < ukupnoStrana && (
              <Link
                href={pageHref(strana + 1)}
                className="rounded-xl border border-line2 bg-card px-4 py-2 text-sm font-semibold text-navy transition hover:border-clay hover:text-clay"
              >
                {t("nextPage")} →
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
