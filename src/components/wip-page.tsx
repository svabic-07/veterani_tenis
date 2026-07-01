import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Privremena stranica za rute koje dolaze u narednim fazama. */
export function WipPage({
  title,
  icon = "🎾",
  phase,
}: {
  title: string;
  icon?: string;
  phase?: string;
}) {
  const t = useTranslations("common");
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-bg2 text-3xl">
        {icon}
      </div>
      <span className="inline-flex items-center gap-2 rounded-full bg-ball/30 px-3 py-1 text-xs font-bold uppercase tracking-wide text-court-dark">
        {t("wip")}
        {phase ? ` · ${phase}` : ""}
      </span>
      <h1 className="mt-4 font-display text-3xl font-extrabold text-navy">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-slate">{t("wipDesc")}</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-xl bg-clay px-5 py-3 font-semibold text-white transition hover:bg-clay-dark"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
