import { setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/ui/page-hero";

export const dynamic = "force-static";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: locale === "sr" ? "Pravilnik i propozicije" : "Regulations" };
}

export default async function PravilnikPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = (sr: string, en: string) => (locale === "sr" ? sr : en);

  const kvalitativne = [
    ["I", L("Elita", "Elite"), L("Bivši takmičari i svi do 35 godina. Najjača grupa.", "Former competitors and everyone up to 35. Strongest group.")],
    ["II", L("Napredni", "Advanced"), L("Dobri igrači min. 35 god; bivši takmičari stariji od 50.", "Strong players min. 35; former competitors over 50.")],
    ["III", L("Srednji", "Intermediate"), L("Ispod \"dobrih\", minimalno 45 godina.", "Below advanced, minimum 45.")],
    ["IV", L("Rekreativci", "Recreational"), L("Slabiji igrači, minimalno 50 godina.", "Weaker players, minimum 50.")],
    ["V", L("Početnici / senior", "Beginners / senior"), L("Najstariji i početnici, minimalno 60 godina.", "Oldest and beginners, minimum 60.")],
  ];

  const starosne = ["20+", "30+", "35+", "40+", "45+", "50+", "55+", "60+", "65+", "70+", "75+"];

  const serije = [
    ["Serija 2000", L("min. 6 + rasveta", "min. 6 + lights"), L("2 dobijena tie-break seta", "best of 3 tie-break sets"), "2000"],
    ["Serija 1000", L("min. 6 + rasveta", "min. 6 + lights"), L("produženi set do 9 (8:8 → TB)", "long set to 9 (8:8 → TB)"), "1000"],
    ["Serija 500", L("min. 3 + rasveta", "min. 3 + lights"), L("produženi set do 9 (8:8 → TB)", "long set to 9 (8:8 → TB)"), "500"],
    ["Serija 250", L("min. 3 + rasveta", "min. 3 + lights"), L("produženi set do 9 (8:8 → TB)", "long set to 9 (8:8 → TB)"), "250"],
    ["Master", L("finale sezone", "season finale"), L("grupni + eliminacija", "groups + knockout"), L("poseban", "special")],
  ];

  // Bodovanje — primer za žreb od 32 (A=2000, I=1000, II=500, III=250)
  const bodovanje = [
    [L("Pobednik", "Winner"), 2000, 1000, 500, 250],
    [L("Finale", "Final"), 1200, 600, 300, 150],
    [L("Polufinale", "Semifinal"), 720, 360, 180, 90],
    [L("Četvrtfinale", "Quarterfinal"), 360, 180, 90, 45],
    [L("Osmina", "Round of 16"), 180, 90, 45, 20],
    [L("Šesnaestina", "Round of 32"), 90, 45, 20, 10],
    [L("Utešni (poraz 1. kolo)", "Consolation (1st-round loss)"), 30, 15, 5, 0],
  ];

  const master = [
    [L("Pobednik", "Winner"), 800],
    [L("Učesnik finala", "Finalist"), 600],
    [L("Učesnik polufinala", "Semifinalist"), 400],
    [L("Učesnik bez pobede", "No wins"), 500],
    [L("Svaka pobeda u grupi", "Each group win"), 200],
    [L("Rezerva", "Reserve"), 200],
  ];

  const noseci = [
    ["8", L("do 10", "up to 10"), "2", "2"],
    ["16", "11–20", "4", "4"],
    ["32", "21–40", "8", "8"],
    ["64", "41–80", "16", "16"],
    ["128", "81–128", "32", "—"],
  ];

  return (
    <>
      <PageHero
        compact
        crumb="/ pravilnik"
        eyebrow={L("Propozicije", "Regulations")}
        title={L("Pravilnik i propozicije", "Regulations")}
        lead={L(
          "Kategorije, serije turnira, sistem bodovanja i pravila nošenja.",
          "Categories, tournament series, scoring system and seeding rules.",
        )}
      />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">

      {/* Kvalitativne kategorije */}
      <Section num="01" title={L("Kvalitativne kategorije (I–V)", "Quality categories (I–V)")}>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <tbody>
              {kvalitativne.map(([k, naziv, opis], i) => (
                <tr key={k as string} className={i % 2 ? "bg-[#FBF8F3]" : "bg-card"}>
                  <td className="w-14 px-4 py-3 text-center font-display text-lg font-extrabold text-clay-dark">{k}</td>
                  <td className="px-2 py-3 font-semibold text-navy">{naziv}</td>
                  <td className="px-4 py-3 text-slate">{opis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          {L(
            "Jedna promena kategorije po sezoni; slabiji smeju u jaču grupu, ne obrnuto (odluka Takmičarske komisije). Dame se takmiče ravnopravno; kategorije IV i V ne mogu igrati dame mlađe od 45 godina.",
            "One category change per season; weaker may move up, not down (decision by the Competition Committee). Women compete equally; categories IV and V are not open to women under 45.",
          )}
        </p>
      </Section>

      {/* Starosne kategorije */}
      <Section num="02" title={L("Starosne kategorije (ITF)", "Age categories (ITF)")}>
        <div className="flex flex-wrap gap-2">
          {starosne.map((s) => (
            <span key={s} className="inline-flex items-center rounded-full bg-court/10 px-3 py-1 text-sm font-semibold text-court-dark">
              {s}
            </span>
          ))}
          <span className="inline-flex items-center rounded-full border border-line2 bg-card px-3 py-1 text-sm text-muted">
            80+ / 85+ / 90+ (ITF, {L("opciono", "optional")})
          </span>
        </div>
        <p className="mt-3 text-sm text-muted">
          {L("Stariji mogu igrati u mlađim razredima, ne i obrnuto.", "Older players may enter younger groups, not vice versa.")}
        </p>
      </Section>

      {/* Serije i format */}
      <Section num="03" title={L("Serije turnira i format", "Tournament series and format")}>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-left text-white">
                <th className="px-4 py-2.5 font-semibold">{L("Serija", "Series")}</th>
                <th className="px-4 py-2.5 font-semibold">{L("Tereni", "Courts")}</th>
                <th className="px-4 py-2.5 font-semibold">{L("Format meča", "Match format")}</th>
                <th className="px-4 py-2.5 text-center font-semibold">{L("Maks. bodovi", "Max points")}</th>
              </tr>
            </thead>
            <tbody>
              {serije.map((row, i) => (
                <tr key={row[0] as string} className={i % 2 ? "bg-[#FBF8F3]" : "bg-card"}>
                  <td className="px-4 py-3 font-semibold text-clay-dark">{row[0]}</td>
                  <td className="px-4 py-3 text-slate">{row[1]}</td>
                  <td className="px-4 py-3 text-slate">{row[2]}</td>
                  <td className="px-4 py-3 text-center font-mono text-ink">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Bodovanje */}
      <Section num="04" title={L("Bodovanje — primer žreba od 32", "Scoring — 32-draw example")}>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-white">
                <th className="px-4 py-2.5 text-left font-semibold">{L("Dostignuto kolo", "Round reached")}</th>
                <th className="px-3 py-2.5 text-center font-semibold">A · 2000</th>
                <th className="px-3 py-2.5 text-center font-semibold">I · 1000</th>
                <th className="px-3 py-2.5 text-center font-semibold">II · 500</th>
                <th className="px-3 py-2.5 text-center font-semibold">III · 250</th>
              </tr>
            </thead>
            <tbody>
              {bodovanje.map((row, i) => (
                <tr key={row[0] as string} className={i % 2 ? "bg-[#FBF8F3]" : "bg-card"}>
                  <td className="px-4 py-3 font-medium text-navy">{row[0]}</td>
                  {row.slice(1).map((v, j) => (
                    <td key={j} className="px-3 py-3 text-center font-mono text-ink">{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-muted">
          {L(
            "Pune tablice za kosture 8, 16, 32, 64 i 128 unose se u koordinatorski panel.",
            "Full tables for draw sizes 8, 16, 32, 64 and 128 are entered in the coordinator panel.",
          )}
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card p-5">
            <h3 className="mb-3 font-display font-bold text-navy">{L("Master turnir", "Masters")}</h3>
            <table className="w-full text-sm">
              <tbody>
                {master.map(([k, v]) => (
                  <tr key={k as string} className="border-t border-line first:border-0">
                    <td className="py-2 text-slate">{k}</td>
                    <td className="py-2 text-right font-mono font-semibold text-ink">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <h3 className="mb-3 font-display font-bold text-navy">{L("Rang lista", "Ranking")}</h3>
            <ul className="space-y-2 text-sm text-slate">
              <li>• {L("Zbir N najboljih rezultata (N = 8/10/13, bira koordinator po sezoni)", "Sum of N best results (N = 8/10/13, set per season)")}</li>
              <li>• {L("Samo aktivni turniri — poslednjih 52 nedelje", "Active tournaments only — last 52 weeks")}</li>
              <li>• {L("Bodovi stariji od godinu dana ispadaju automatski", "Points older than a year drop off automatically")}</li>
              <li>• {L("Obračun nedeljno, po kategoriji × disciplini", "Weekly recalculation, per category × discipline")}</li>
            </ul>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line border-t-[3px] border-t-court bg-card p-4">
            <h4 className="font-bold text-navy">A · {L("Klasični (napredovanje)", "Classic (progression)")}</h4>
            <p className="mt-1 text-sm text-slate">
              {L("Boduje se po dostignutom kolu; poraz u 1. kolu = mali utešni bodovi. Podrazumevani model.", "Points by round reached; 1st-round loss = small consolation points. Default model.")}
            </p>
          </div>
          <div className="rounded-2xl border border-line border-t-[3px] border-t-clay bg-card p-4">
            <h4 className="font-bold text-navy">B · {L("\"Svi dobijaju bodove\"", "\"Everyone scores\"")}</h4>
            <p className="mt-1 text-sm text-slate">
              {L("Svaki učesnik osvaja bodove i bez pobede (Master-stil). Nagrađuje učešće.", "Every participant scores even without a win (Masters style). Rewards participation.")}
            </p>
          </div>
        </div>
      </Section>

      {/* Nošenje */}
      <Section num="05" title={L("Nošenje (ITF Reg. 35–38)", "Seeding (ITF Reg. 35–38)")}>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-white">
                <th className="px-4 py-2.5 text-left font-semibold">{L("Žreb", "Draw")}</th>
                <th className="px-4 py-2.5 text-center font-semibold">{L("Igrača", "Players")}</th>
                <th className="px-4 py-2.5 text-center font-semibold">{L("Nosioci · singl", "Seeds · singles")}</th>
                <th className="px-4 py-2.5 text-center font-semibold">{L("Nosioci · dubl", "Seeds · doubles")}</th>
              </tr>
            </thead>
            <tbody>
              {noseci.map((row, i) => (
                <tr key={row[0]} className={i % 2 ? "bg-[#FBF8F3]" : "bg-card"}>
                  <td className="px-4 py-3 font-bold text-navy">{row[0]}</td>
                  <td className="px-4 py-3 text-center text-slate">{row[1]}</td>
                  <td className="px-4 py-3 text-center font-mono text-ink">{row[2]}</td>
                  <td className="px-4 py-3 text-center font-mono text-ink">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          {L(
            "Round-robin (grupe): 3–5 igrača = 0 nosilaca · 6–7 = 2 nosioca. Nerangirani se ne nose. Razdvajanje istog kluba/države po ITF pravilu.",
            "Round-robin (groups): 3–5 players = 0 seeds · 6–7 = 2 seeds. Unranked are not seeded. Same club/country separated per ITF rule.",
          )}
        </p>
      </Section>
      </div>
    </>
  );
}

function Section({
  num,
  title,
  children,
}: {
  readonly num: string;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-mono text-sm text-clay">{num}</span>
        <h2 className="font-display text-xl font-extrabold text-navy sm:text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}
