import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/ui/page-hero";
import { membershipRequestAction } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: locale === "sr" ? "Učlanjenje" : "Join us" };
}

const KATEGORIJE = ["I", "II", "III", "IV", "V"] as const;

const field =
  "w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay";

export default async function UclanjenjePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const L = (sr: string, en: string) => (locale === "sr" ? sr : en);

  return (
    <>
      <PageHero
        compact
        crumb="/ učlanjenje"
        eyebrow="🎾"
        title={L("Učlanjenje u TVS", "Join TVS")}
        lead={L(
          "Svaki državljanin Srbije od 20 godina naviše može da se učlani i takmiči — bez obzira na pol.",
          "Any Serbian citizen aged 20+ can join and compete — regardless of gender.",
        )}
      />
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        {sp.poslato ? (
          <div className="rounded-2xl border border-court/30 bg-court/8 p-6">
            <p className="font-display text-lg font-bold text-court-dark">
              ✅ {L("Zahtev je poslat!", "Request sent!")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate">
              {L(
                "Koordinator saveza će pregledati vaš zahtev. Kada bude odobren, na ovu email adresu možete da se prijavite na sajt (Prijava → link stiže na email) i sistem će vas automatski povezati sa vašim igračkim profilom.",
                "The coordinator will review your request. Once approved, you can sign in with this email (Sign in → a link arrives by email) and the system will automatically link you to your player profile.",
              )}
            </p>
            <Link href="/" className="mt-4 inline-block text-sm font-semibold text-clay hover:underline">
              ← {L("Nazad na početnu", "Back to home")}
            </Link>
          </div>
        ) : (
          <>
            {sp.greska && (
              <p className="mb-5 rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay-dark">
                {L(
                  "Slanje nije uspelo — proverite ime, prezime i email pa pokušajte ponovo.",
                  "Sending failed — check the name and email and try again.",
                )}
              </p>
            )}
            <form action={membershipRequestAction} className="space-y-4 rounded-2xl border border-line bg-card p-6 shadow-sm">
              <input type="hidden" name="locale" value={locale} />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-navy">{L("Ime *", "First name *")}</span>
                  <input type="text" name="ime" required minLength={2} className={field} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-navy">{L("Prezime *", "Last name *")}</span>
                  <input type="text" name="prezime" required minLength={2} className={field} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-navy">{L("Godište", "Year of birth")}</span>
                  <input type="text" name="godiste" inputMode="numeric" placeholder="npr. 1965" className={field} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-navy">{L("Grad", "City")}</span>
                  <input type="text" name="grad" className={field} />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-navy">{L("Klub (ako postoji)", "Club (if any)")}</span>
                <input type="text" name="klub" className={field} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-navy">
                  {L("Željena kategorija", "Preferred category")}
                </span>
                <select name="kategorija" defaultValue="" className={field}>
                  <option value="">{L("— nisam siguran/na —", "— not sure —")}</option>
                  {KATEGORIJE.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-muted">
                  {L(
                    "I najjača … V najslabija (II ≥ 35 · III ≥ 45 · IV ≥ 50 · V ≥ 60 god). Konačnu kategoriju potvrđuje koordinator.",
                    "I strongest … V weakest (II ≥ 35 · III ≥ 45 · IV ≥ 50 · V ≥ 60 yrs). The coordinator confirms the final category.",
                  )}
                </span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-navy">Email *</span>
                  <input type="email" name="email" required className={field} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-navy">{L("Telefon", "Phone")}</span>
                  <input type="text" name="telefon" className={field} />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-navy">{L("Napomena", "Note")}</span>
                <textarea name="napomena" rows={3} maxLength={500} className={field}
                  placeholder={L("npr. teniski staž, bivši takmičar…", "e.g. tennis experience, former competitor…")} />
              </label>
              <p className="text-xs leading-relaxed text-muted">
                {L(
                  "Slanjem zahteva prihvatate da se ime, prezime, klub i grad javno prikazuju u direktorijumu članova; kontakt podaci ostaju privatni. Godišnja članarina se plaća po odobrenju.",
                  "By submitting you agree that your name, club and city appear in the public member directory; contact details stay private. The annual membership fee is paid after approval.",
                )}
              </p>
              <button
                type="submit"
                className="w-full rounded-xl bg-clay px-5 py-3 text-base font-bold text-white transition hover:bg-clay-dark"
              >
                {L("Pošalji zahtev za učlanjenje", "Send membership request")}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
