import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getPlayerById,
  getPlayerRankings,
  getPlayerHistory,
  getPlayerMatches,
  getPlayerTrophies,
} from "@/lib/data/players";
import { formatDateRange } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Metric } from "@/components/ui/metric";

export const dynamic = "force-dynamic";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const p = await getPlayerById(id);
  if (p) return { title: `${p.ime} ${p.prezime}` };
  return { title: locale === "sr" ? "Igrač" : "Player" };
}

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

  const [rankings, history, matches, trophies] = await Promise.all([
    getPlayerRankings(id),
    getPlayerHistory(id),
    getPlayerMatches(id),
    getPlayerTrophies(id),
  ]);

  const age = p.godiste ? new Date().getFullYear() - p.godiste : null;
  const best = rankings[0];
  const titula = trophies.brojevi.prvo;

  const info: { label: string; value: string }[] = [
    ...(p.kategorija ? [{ label: t("category"), value: p.kategorija }] : []),
    ...(p.clubs ? [{ label: t("club"), value: `${p.clubs.naziv}${p.clubs.grad ? ` · ${p.clubs.grad}` : ""}` }] : []),
    { label: t("country"), value: p.drzava },
    ...(p.godiste ? [{ label: t("birthYear"), value: `${p.godiste}${age ? ` (${age})` : ""}` }] : []),
    ...(p.itf_ipin ? [{ label: "ITF IPIN", value: p.itf_ipin }] : []),
  ];

  return (
    <>
      {/* Profil hero (navy) */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 300px at 92% -10%, rgba(214,232,75,.14), transparent 66%)," +
              "linear-gradient(135deg,#16263E 0%, #13314A 60%, #1C5340 100%)",
          }}
        />
        <div className="relative z-[1] mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <Link href="/igraci" className="font-mono text-sm font-bold text-ball hover:text-ball-deep">
            {t("back")}
          </Link>
          <div className="mt-4 flex items-center gap-5">
            <Avatar ime={p.ime} prezime={p.prezime} size={84} onDark />
            <div className="min-w-0">
              <h1 className="truncate font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {p.ime} {p.prezime}
              </h1>
              <p className="mt-1 text-white/75">
                {p.clubs?.naziv ?? "—"}
                {p.kategorija ? ` · ${t("category")} ${p.kategorija}` : ""}
                {p.drzava && p.drzava !== "RS" ? ` · ${p.drzava}` : ""}
              </p>
              {titula + trophies.brojevi.drugo + trophies.brojevi.trece > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-4 text-[15px] font-semibold text-white/90">
                  {trophies.brojevi.prvo > 0 && <span>🥇 {trophies.brojevi.prvo}</span>}
                  {trophies.brojevi.drugo > 0 && <span>🥈 {trophies.brojevi.drugo}</span>}
                  {trophies.brojevi.trece > 0 && <span>🥉 {trophies.brojevi.trece}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {/* Metric red */}
        {best && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric value={`#${best.mesto}`} label={`${t("disc.singl")} ${best.kategorija}`} accent />
            <Metric value={best.bodovi} label={t("points")} />
            <Metric value={history.length} label={t("tournaments")} />
            <Metric value={titula} label={t("titles")} />
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-[1fr_1.3fr]">
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
          {trophies.lista.length > 0 && (
            <div>
              <h2 className="mb-2 font-display text-lg font-bold text-navy">{t("trophies")}</h2>
              <ul className="overflow-hidden rounded-2xl border border-line bg-card">
                {trophies.lista.map((tr, i) => (
                  <li
                    key={`${tr.slug}-${tr.kategorija}-${tr.disciplina}-${i}`}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i % 2 ? "bg-[#FBF8F3]" : ""}`}
                  >
                    <span className="shrink-0 text-lg" aria-hidden>
                      {MEDAL[tr.mesto] ?? "🏅"}
                    </span>
                    <span className="min-w-0 flex-1">
                      {tr.slug ? (
                        <Link
                          href={`/turnir/${tr.slug}`}
                          className="block truncate font-medium text-navy hover:text-clay"
                        >
                          {tr.naziv}
                        </Link>
                      ) : (
                        <span className="block truncate font-medium text-navy">{tr.naziv}</span>
                      )}
                      <span className="block text-xs text-muted">
                        {t("category")} {tr.kategorija} · {t(`disc.${tr.disciplina}`)}
                        {tr.datum ? ` · ${tr.datum.slice(0, 4)}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="mb-2 font-display text-lg font-bold text-navy">{t("ranking")}</h2>
            {rankings.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line2 bg-card p-5 text-sm text-muted">
                {t("noRanking")}
              </p>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-line bg-card">
                {rankings.map((r, i) => (
                  <li
                    key={`${r.kategorija}-${r.disciplina}`}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i % 2 ? "bg-[#FBF8F3]" : ""}`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-court/12 font-display text-sm font-bold text-court-dark">
                      #{r.mesto}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-navy">
                        {t("category")} {r.kategorija} · {t(`disc.${r.disciplina}`)}
                      </span>
                      <span className="block text-xs text-muted">
                        {t("rankingRow", { bodovi: r.bodovi, turnira: r.broj_turnira })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-2 font-display text-lg font-bold text-navy">{t("history")}</h2>
            {history.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line2 bg-card p-5 text-sm text-muted">
                {t("noHistory")}
              </p>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-line bg-card">
                {history.map((h, i) => (
                  <li
                    key={`${h.tournaments?.legacy_id}-${h.kategorija}-${h.disciplina}-${i}`}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2 text-sm ${i % 2 ? "bg-[#FBF8F3]" : ""}`}
                  >
                    {h.tournaments?.legacy_id ? (
                      <Link
                        href={`/turnir/${h.tournaments.legacy_id}`}
                        className="min-w-0 flex-1 truncate font-medium text-navy hover:text-clay"
                      >
                        {h.tournaments.naziv}
                      </Link>
                    ) : (
                      <span className="min-w-0 flex-1 truncate font-medium text-navy">—</span>
                    )}
                    <span className="text-xs text-muted">
                      {formatDateRange(h.tournaments?.datum_od ?? null, null, locale)} ·{" "}
                      {h.kategorija} {t(`disc.${h.disciplina}`)}
                    </span>
                    <span className="shrink-0 font-mono text-xs font-bold text-court-dark">
                      +{h.bodovi}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-2 font-display text-lg font-bold text-navy">{t("matches")}</h2>
            {matches.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line2 bg-card p-5 text-sm text-muted">
                {t("noMatches")}
              </p>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-line bg-card">
                {matches.map((m, i) => {
                  const jaSam1 = m.p1?.id === id;
                  const protivnik = jaSam1 ? m.p2 : m.p1;
                  const pobedio = (m.winner_slot === 1) === jaSam1;
                  const rezultat = m.match_sets
                    .toSorted((a, b) => a.set_no - b.set_no)
                    .map((s) => (jaSam1 ? `${s.gem1}:${s.gem2}` : `${s.gem2}:${s.gem1}`))
                    .join(" ");
                  return (
                    <li
                      key={m.id}
                      className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2 text-sm ${i % 2 ? "bg-[#FBF8F3]" : ""}`}
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          pobedio ? "bg-court/15 text-court-dark" : "bg-clay/10 text-clay-dark"
                        }`}
                      >
                        {pobedio ? t("winShort") : t("lossShort")}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {protivnik ? (
                          <Link href={`/igraci/${protivnik.id}`} className="font-medium text-navy hover:text-clay">
                            {protivnik.ime[0]}. {protivnik.prezime}
                          </Link>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                        <span className="ml-2 text-xs text-muted">
                          {m.draws.event.turnir.naziv.slice(0, 40)}
                          {m.draws.event.turnir.naziv.length > 40 ? "…" : ""}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-xs">
                        {m.status === "walkover" ? "w.o." : rezultat || "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
        </div>
      </div>
    </>
  );
}
