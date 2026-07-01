import { setRequestLocale, getTranslations } from "next-intl/server";
import { WipPage } from "@/components/wip-page";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  return <WipPage title={t("calendar")} icon="📅" phase="Faza 1" />;
}
