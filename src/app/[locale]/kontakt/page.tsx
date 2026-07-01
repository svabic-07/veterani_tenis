import { setRequestLocale } from "next-intl/server";

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
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <span className="font-mono text-sm text-clay">/ kontakt</span>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-navy sm:text-4xl">
        {L("Kontakt", "Contact")}
      </h1>
      <p className="mt-2 max-w-xl text-slate">
        {L(
          "Za pitanja o turnirima, prijavama i rang listama obratite se koordinatoru saveza.",
          "For questions about tournaments, entries and rankings, contact the association coordinator.",
        )}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
  );
}
