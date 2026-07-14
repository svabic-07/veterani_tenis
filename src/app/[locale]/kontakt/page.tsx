import { setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/ui/page-hero";

export const dynamic = "force-static";

export default async function KontaktPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = (sr: string, en: string) => (locale === "sr" ? sr : en);

  return (
    <>
      <PageHero
        compact
        crumb="/ kontakt"
        eyebrow={L("Savez", "Association")}
        title={L("Kontakt", "Contact")}
        lead={L(
          "Za pitanja o turnirima, prijavama i rang listama obratite se koordinatoru saveza.",
          "For questions about tournaments, entries and rankings, contact the association coordinator.",
        )}
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-muted">E-mail</div>
          <a href="mailto:info@teniskiveteranisrbije.rs" className="mt-1 block font-semibold text-clay-dark hover:underline">
            info@teniskiveteranisrbije.rs
          </a>
        </div>
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-muted">
            {L("Sajt", "Website")}
          </div>
          <div className="mt-1 font-semibold text-navy">teniskiveteranisrbije.rs</div>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted">
        {L(
          "Napomena: kontakt podaci su privremeni i biće ažurirani pred zvanično lansiranje.",
          "Note: contact details are placeholders and will be updated before the official launch.",
        )}
      </p>
      </div>
    </>
  );
}
