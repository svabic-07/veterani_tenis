import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/page-hero";
import {
  addPlayerAction,
  updatePlayerAction,
  addSanctionAction,
  deleteSanctionAction,
} from "../actions";
import { CopyEmails } from "./copy-emails";
import { MergeForm } from "./merge-form";

export const dynamic = "force-dynamic";

const KATEGORIJE = ["I", "II", "III", "IV", "V"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "coordinator" });
  return { title: t("members.title") };
}

export default async function ClanoviPage({
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
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";

  const t = await getTranslations("coordinator");
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

  // Pretraga igrača za izmenu (ime/prezime; do 15 pogodaka)
  const words = q.replace(/[,()*%:.]/g, " ").split(/\s+/).filter((w) => w.length >= 2);
  let foundQuery = supabase
    .from("players")
    .select("id, ime, prezime, godiste, kategorija, klub_id, is_active, legacy_id, player_private ( email, telefon )")
    .order("prezime")
    .limit(15);
  if (words.length >= 2) {
    const [a, b] = [words[0], words.slice(1).join(" ")];
    foundQuery = foundQuery.or(
      `and(ime.ilike.${a}*,prezime.ilike.${b}*),and(ime.ilike.${b}*,prezime.ilike.${a}*)`,
    );
  } else if (words.length === 1) {
    foundQuery = foundQuery.or(`ime.ilike.*${words[0]}*,prezime.ilike.*${words[0]}*`);
  }

  const [{ data: clubs }, { data: privateRows }, { data: found }] = await Promise.all([
    supabase.from("clubs").select("id, naziv").order("naziv"),
    supabase.from("player_private").select("email").not("email", "is", null),
    words.length > 0 ? foundQuery : Promise.resolve({ data: [] as never[] }),
  ]);

  // sankcije nađenih igrača (za prikaz u kartici)
  const foundIds = (found ?? []).map((p) => p.id);
  type SankcijaRow = {
    id: string;
    player_id: string;
    tip: string;
    razlog: string | null;
    vazi_do: string | null;
    created_at: string;
  };
  let sankcijeRows: SankcijaRow[] = [];
  if (foundIds.length) {
    const { data } = await supabase
      .from("sanctions")
      .select("id, player_id, tip, razlog, vazi_do, created_at")
      .in("player_id", foundIds)
      .order("created_at", { ascending: false });
    sankcijeRows = data ?? [];
  }
  const sankcijeByPlayer = new Map<string, SankcijaRow[]>();
  for (const s of sankcijeRows) {
    const list = sankcijeByPlayer.get(s.player_id) ?? [];
    list.push(s);
    sankcijeByPlayer.set(s.player_id, list);
  }
  const emails = [
    ...new Set(
      (privateRows ?? [])
        .map((r) => (r.email ?? "").trim().toLowerCase())
        .filter((e) => e.includes("@")),
    ),
  ].join(",");

  return (
    <>
      <PageHero compact crumb="/ koordinator / članovi" eyebrow="👥" title={t("members.title")} lead={t("members.lead")} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
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

        {/* Novi igrač / gost */}
        <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold text-navy">{t("members.new")}</h2>
          <p className="mt-1 text-sm text-muted">{t("members.newHint")}</p>
          <form action={addPlayerAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="locale" value={locale} />
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-navy">{t("members.firstName")}</span>
              <input type="text" name="ime" required minLength={2} className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-navy">{t("members.lastName")}</span>
              <input type="text" name="prezime" required minLength={2} className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-navy">{t("members.birthYear")}</span>
              <input type="text" name="godiste" inputMode="numeric" placeholder="1975" className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-navy">{t("members.club")}</span>
              <select name="klubId" defaultValue="" className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay">
                <option value="">—</option>
                {(clubs ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.naziv}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-navy">{t("members.category")}</span>
              <select name="kategorija" defaultValue="" className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay">
                <option value="">—</option>
                {KATEGORIJE.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-navy">
              <input type="checkbox" name="gost" value="1" className="accent-clay" />
              {t("members.guest")}
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-dark">
                {t("members.add")}
              </button>
            </div>
          </form>
        </section>

        {/* Izmena igrača */}
        <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold text-navy">{t("members.editTitle")}</h2>
          <form method="get" className="mt-3 flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder={t("members.searchPlaceholder")}
              className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 text-sm outline-none focus:border-clay"
            />
            <button type="submit" className="rounded-xl border border-line2 px-4 py-2 text-sm font-semibold text-slate transition hover:border-clay hover:text-clay">
              {t("clubs.search")}
            </button>
          </form>
          {q && (found ?? []).length === 0 && (
            <p className="mt-3 text-sm text-muted">{t("members.noResults")}</p>
          )}
          <ul className="mt-3 space-y-3">
            {(found ?? []).map((p) => (
              <li key={p.id} className="rounded-xl border border-line2 p-3">
                <p className="font-semibold text-navy">
                  {p.ime} {p.prezime}
                  {p.legacy_id?.startsWith("gost-") && (
                    <span className="ml-2 rounded bg-bg2 px-1.5 py-0.5 text-xs font-semibold text-muted">
                      {t("members.guestTag")}
                    </span>
                  )}
                </p>
                <form action={updatePlayerAction} className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="playerId" value={p.id} />
                  <input type="hidden" name="q" value={q} />
                  <label className="text-xs">
                    <span className="mb-0.5 block font-semibold text-muted">{t("members.firstName")}</span>
                    <input type="text" name="ime" defaultValue={p.ime} className="w-full rounded-lg border border-line2 bg-bg px-2 py-1.5 text-sm outline-none focus:border-clay" />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block font-semibold text-muted">{t("members.lastName")}</span>
                    <input type="text" name="prezime" defaultValue={p.prezime} className="w-full rounded-lg border border-line2 bg-bg px-2 py-1.5 text-sm outline-none focus:border-clay" />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block font-semibold text-muted">{t("members.birthYear")}</span>
                    <input type="text" name="godiste" inputMode="numeric" defaultValue={p.godiste ?? ""} className="w-full rounded-lg border border-line2 bg-bg px-2 py-1.5 text-sm outline-none focus:border-clay" />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block font-semibold text-muted">{t("members.category")}</span>
                    <select name="kategorija" defaultValue={p.kategorija ?? ""} className="w-full rounded-lg border border-line2 bg-bg px-2 py-1.5 text-sm outline-none focus:border-clay">
                      <option value="">—</option>
                      {KATEGORIJE.map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block font-semibold text-muted">{t("members.club")}</span>
                    <select name="klubId" defaultValue={p.klub_id ?? ""} className="w-full rounded-lg border border-line2 bg-bg px-2 py-1.5 text-sm outline-none focus:border-clay">
                      <option value="">—</option>
                      {(clubs ?? []).map((c) => (
                        <option key={c.id} value={c.id}>{c.naziv}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block font-semibold text-muted">Email</span>
                    <input type="email" name="email" defaultValue={p.player_private?.email ?? ""} className="w-full rounded-lg border border-line2 bg-bg px-2 py-1.5 text-sm outline-none focus:border-clay" />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block font-semibold text-muted">{t("members.phone")}</span>
                    <input type="text" name="telefon" defaultValue={p.player_private?.telefon ?? ""} className="w-full rounded-lg border border-line2 bg-bg px-2 py-1.5 text-sm outline-none focus:border-clay" />
                  </label>
                  <div className="flex items-end justify-between gap-2">
                    <label className="flex items-center gap-1.5 pb-1.5 text-xs text-navy">
                      <input type="checkbox" name="aktivan" value="1" defaultChecked={p.is_active} className="accent-court" />
                      {t("members.active")}
                    </label>
                    <button type="submit" className="rounded-lg bg-court px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-court-dark">
                      {t("members.save")}
                    </button>
                  </div>
                </form>

                {/* Sankcije (disciplinska evidencija) */}
                <details className="mt-3 rounded-lg border border-clay/25 bg-bg2 p-2.5">
                  <summary className="cursor-pointer text-xs font-semibold text-clay-dark">
                    ⚠️ {t("members.sanctions")} ({(sankcijeByPlayer.get(p.id) ?? []).length})
                  </summary>
                  {(sankcijeByPlayer.get(p.id) ?? []).length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {(sankcijeByPlayer.get(p.id) ?? []).map((s) => (
                        <li key={s.id} className="flex items-center gap-2 text-xs">
                          <span className="min-w-0 flex-1 text-navy">
                            <b>{t(`sankcija.${s.tip}`)}</b>
                            {s.vazi_do ? ` · ${t("members.sanctionUntil")} ${s.vazi_do}` : ""}
                            {s.razlog ? ` · ${s.razlog}` : ""}
                          </span>
                          <form action={deleteSanctionAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="sanctionId" value={s.id} />
                            <button type="submit" className="rounded px-1.5 py-0.5 font-semibold text-clay hover:bg-clay/10">
                              {t("members.sanctionRemove")}
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form action={addSanctionAction} className="mt-2 flex flex-wrap items-center gap-1.5">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="playerId" value={p.id} />
                    <input type="hidden" name="q" value={q} />
                    <select name="tip" defaultValue="opomena" className="rounded-md border border-line2 bg-card px-1.5 py-1 text-xs outline-none focus:border-clay">
                      <option value="opomena">{t("sankcija.opomena")}</option>
                      <option value="oduzimanje_bodova">{t("sankcija.oduzimanje_bodova")}</option>
                      <option value="suspenzija">{t("sankcija.suspenzija")}</option>
                    </select>
                    <input type="date" name="vaziDo" className="rounded-md border border-line2 bg-card px-1.5 py-1 text-xs outline-none focus:border-clay" title={t("members.sanctionUntil")} />
                    <input type="text" name="razlog" placeholder={t("members.sanctionReason")} className="min-w-0 flex-1 basis-32 rounded-md border border-line2 bg-card px-1.5 py-1 text-xs outline-none focus:border-clay" />
                    <button type="submit" className="rounded-md border border-clay/40 px-2 py-1 text-xs font-semibold text-clay-dark transition hover:bg-clay/10">
                      {t("members.sanctionAdd")}
                    </button>
                  </form>
                  <p className="mt-1.5 text-[11px] text-muted">{t("members.sanctionHint")}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>

        {/* Spajanje duplikata */}
        <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold text-navy">{t("members.mergeTitle")}</h2>
          <p className="mb-3 mt-1 text-sm text-muted">{t("members.mergeHint")}</p>
          <MergeForm
            locale={locale}
            labels={{
              keep: t("members.mergeKeep"),
              dup: t("members.mergeDup"),
              hint: t("members.searchPlaceholder"),
              merge: t("members.mergeCta"),
              confirm: t("members.mergeConfirm"),
            }}
          />
        </section>

        {/* Email svim članovima */}
        <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold text-navy">{t("members.emailTitle")}</h2>
          <p className="mb-3 mt-1 text-sm text-muted">{t("members.emailHint")}</p>
          <CopyEmails
            emails={emails}
            labels={{ copy: t("members.copyEmails"), copied: t("members.copied"), show: t("members.showEmails") }}
          />
        </section>
      </div>
    </>
  );
}
