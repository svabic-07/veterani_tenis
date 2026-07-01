import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("common");
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <div className="font-display text-7xl font-extrabold text-clay">404</div>
      <h1 className="mt-4 font-display text-2xl font-extrabold text-navy">
        {t("notFoundTitle")}
      </h1>
      <p className="mt-3 text-slate">{t("notFoundDesc")}</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-xl bg-clay px-5 py-3 font-semibold text-white transition hover:bg-clay-dark"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
