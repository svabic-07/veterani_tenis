import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPlayerById } from "@/lib/data/players";

export const dynamic = "force-dynamic";

export default async function ProfilPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("players.profile");
  const p = await getPlayerById(id);
  if (!p) notFound();

  const age = p.godiste ? new Date().getFullYear() - p.godiste : null;
  const initials = `${p.ime[0] ?? ""}${p.prezime[0] ?? ""}`.toUpperCase();

  const info: { label: string; value: string }[] = [
    ...(p.kategorija ? [{ label: t("category"), value: p.kategorija }] : []),
    ...(p.clubs ? [{ label: t("club"), value: `${p.clubs.naziv}${p.clubs.grad ? ` · ${p.clubs.grad}` : ""}` }] : []),
    { label: t("country"), value: p.drzava },
    ...(p.godiste ? [{ label: t("birthYear"), value: `${p.godiste}${age ? ` (${age})` : ""}` }] : []),
    ...(p.itf_ipin ? [{ label: "ITF IPIN", value: p.itf_ipin }] : []),
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/igraci" className="text-sm font-semibold text-clay-dark hover:underline">
        {t("back")}
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-court/12 font-display text-xl font-bold text-court-dark">
          {initials}
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">
            {p.ime} {p.prezime}
          </h1>
          <p className="text-sm text-muted">
            {p.clubs?.naziv ?? "—"}
            {p.kategorija ? ` · ${t("category")} ${p.kategorija}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_1.3fr]">
        <section>
          <dl className="overflow-hidden rounded-2xl border border-line bg-card">
            {info.map((row, i) => (
              <div key={row.label} className={`flex justify-between gap-4 px-4 py-3 text-sm ${i % 2 ? "bg-[#FBF8F3]" : ""}`}>
                <dt className="text-muted">{row.label}</dt>
                <dd className="text-right font-medium text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="mb-2 font-display text-lg font-bold text-navy">{t("ranking")}</h2>
            <p className="rounded-2xl border border-dashed border-line2 bg-card p-5 text-sm text-muted">
              {t("noRanking")}
            </p>
          </div>
          <div>
            <h2 className="mb-2 font-display text-lg font-bold text-navy">{t("history")}</h2>
            <p className="rounded-2xl border border-dashed border-line2 bg-card p-5 text-sm text-muted">
              {t("noHistory")}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
