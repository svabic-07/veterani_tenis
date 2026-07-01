import { setRequestLocale } from "next-intl/server";
import { WipPage } from "@/components/wip-page";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const title = locale === "sr" ? "Sudijski portal" : "Referee portal";
  return <WipPage title={title} icon="⚖️" phase="Faza 3" />;
}
