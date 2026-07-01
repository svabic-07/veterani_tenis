import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { searchPlayers } from "@/lib/data/players";
import { Constants } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "players" });
  return { title: t("title") };
}

const CATEGORIES = Constants.public.Enums.quality_category;

function initials(ime: string, prezime: string) {
  return `${ime[0] ?? ""}${prezime[0] ?? ""}`.toUpperCase();
}

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

  const t = await getTranslations("players");
  const { players, count } = await searchPlayers({ q, kategorija });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-6">
        <span className="font-mono text-sm text-clay">/ igraci</span>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-navy sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-slate">{t("subtitle")}</p>
      </header>

      {/* Pretraga */}
      <form className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t("searchPlaceholder")}
          className="min-w-0 flex-1 rounded-xl border border-line2 bg-card px-4 py-2.5 text-sm outline-none focus:border-clay"
        />
        <select
          name="kategorija"
          defaultValue={kategorija}
          className="rounded-xl border border-line2 bg-card px-3 py-2.5 text-sm outline-none focus:border-clay"
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
          className="rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-dark"
        >
          {t("search")}
        </button>
      </form>

      <p className="mb-5 text-sm font-semibold text-muted">{t("count", { n: count })}</p>

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
                className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm transition hover:border-line2 hover:shadow-[var(--shadow-tvs)]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-court/12 font-display text-sm font-bold text-court-dark">
                  {initials(p.ime, p.prezime)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-navy">
                    {p.ime} {p.prezime}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {p.clubs?.naziv ?? "—"}
                    {p.kategorija ? ` · ${t("category")} ${p.kategorija}` : ""}
                    {p.drzava && p.drzava !== "RS" ? ` · ${p.drzava}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
