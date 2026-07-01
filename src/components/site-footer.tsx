import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";

export function SiteFooter() {
  const t = useTranslations("footer");
  const tb = useTranslations("brand");
  const year = 2026;

  const cols = [
    {
      title: t("sections.explore"),
      links: [
        { label: t("links.calendar"), href: "/kalendar" },
        { label: t("links.rankings"), href: "/rang-liste" },
        { label: t("links.players"), href: "/igraci" },
        { label: t("links.news"), href: "/vesti" },
      ],
    },
    {
      title: t("sections.account"),
      links: [
        { label: t("links.login"), href: "/prijava" },
        { label: t("links.referee"), href: "/sudija" },
        { label: t("links.rules"), href: "/pravilnik" },
      ],
    },
    {
      title: t("sections.about"),
      links: [
        { label: t("links.about"), href: "/o-savezu" },
        { label: t("links.contact"), href: "/kontakt" },
      ],
    },
  ] as const;

  return (
    <footer className="mt-16 border-t border-line bg-navy text-white/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo size={40} />
            <span className="font-display text-base font-extrabold text-white">
              {tb("name")}
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-white/55">{tb("tagline")}</p>
        </div>

        {cols.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white/45">
              {col.title}
            </h4>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/70 transition hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {year} {tb("name")}. {t("rights")}</span>
          <span className="font-mono">{t("builtWith")}</span>
        </div>
      </div>
    </footer>
  );
}
