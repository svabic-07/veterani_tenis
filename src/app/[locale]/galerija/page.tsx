import { setRequestLocale } from "next-intl/server";
import { createPublicClient } from "@/lib/supabase/public";
import { PageHero } from "@/components/ui/page-hero";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: locale === "sr" ? "Galerija" : "Gallery" };
}

const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/galerija/`;

export default async function GalerijaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = (sr: string, en: string) => (locale === "sr" ? sr : en);

  const supabase = createPublicClient();
  const { data: photos } = await supabase
    .from("gallery_photos")
    .select("id, path, naslov, created_at")
    .order("created_at", { ascending: false })
    .limit(120);

  return (
    <>
      <PageHero
        compact
        crumb="/ galerija"
        eyebrow="📷"
        title={L("Galerija", "Gallery")}
        lead={L("Fotografije sa turnira i okupljanja.", "Photos from tournaments and gatherings.")}
      />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {(photos ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line2 bg-card p-10 text-center text-muted">
            {L("Galerija je još prazna — fotografije stižu uskoro.", "The gallery is empty — photos coming soon.")}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(photos ?? []).map((f) => (
              <li key={f.id} className="group overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
                <a href={`${STORAGE_BASE}${f.path}`} target="_blank" rel="noopener noreferrer">
                  {/* Supabase storage servira javne slike; next/image bi zahtevao remotePatterns */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${STORAGE_BASE}${f.path}`}
                    alt={f.naslov ?? "TVS"}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.03]"
                  />
                </a>
                {f.naslov && (
                  <p className="truncate px-3 py-2 text-xs text-slate">{f.naslov}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
