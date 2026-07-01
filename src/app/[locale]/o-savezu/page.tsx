import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-static";

export default async function OSavezuPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = (sr: string, en: string) => (locale === "sr" ? sr : en);

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <span className="font-mono text-sm text-clay">/ o-savezu</span>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-navy sm:text-4xl">
        {L("O savezu", "About the association")}
      </h1>

      <div className="mt-6 space-y-4 text-slate">
        <p>
          {L(
            "Teniski Veterani Srbije okupljaju rekreativne i bivše takmičarske igrače kroz sistem turnira, kvalitativnih (I–V) i starosnih kategorija, u disciplinama singl, dubl i miks.",
            "Serbian Tennis Veterans bring together recreational and former competitive players through a system of tournaments, quality (I–V) and age categories, in singles, doubles and mixed disciplines.",
          )}
        </p>
        <p>
          {L(
            "Sezona obuhvata serije turnira (2000, 1000, 500, 250) i Master, sa zvaničnom rang listom po principu N najboljih rezultata u poslednjih 52 nedelje.",
            "The season includes tournament series (2000, 1000, 500, 250) and the Masters, with an official ranking based on the N best results over the last 52 weeks.",
          )}
        </p>
        <p>
          {L(
            "Ovaj sistem je moderan informacioni portal saveza — kalendar, žreb i rezultati uživo, rang liste i profili igrača, po uzoru na ITF World Tennis Masters Tour.",
            "This system is the association's modern information portal — calendar, live draws and results, rankings and player profiles, modeled on the ITF World Tennis Masters Tour.",
          )}
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { v: "~2.600", l: L("igrača", "players") },
          { v: "5 + 11", l: L("kategorija", "categories") },
          { v: "4 + 1", l: L("serije + Master", "series + Masters") },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-line bg-card p-5 text-center">
            <div className="font-display text-2xl font-extrabold text-clay-dark">{s.v}</div>
            <div className="mt-1 text-sm text-muted">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
