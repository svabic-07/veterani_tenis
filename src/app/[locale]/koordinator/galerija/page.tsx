import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/page-hero";
import { UploadForm } from "./upload-form";
import { deleteGalleryPhotoAction } from "../actions";

export const dynamic = "force-dynamic";

const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/galerija/`;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "coordinator" });
  return { title: t("gallery.title") };
}

export default async function KoordinatorGalerijaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : "";
  const greska = typeof sp.greska === "string" ? sp.greska : "";

  const t = await getTranslations("coordinator");
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    redirect({ href: "/prijava", locale });
    return null;
  }
  const { data: staff } = await supabase.rpc("is_staff");
  if (!staff) {
    redirect({ href: "/", locale });
    return null;
  }

  const { data: photos } = await supabase
    .from("gallery_photos")
    .select("id, path, naslov, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <PageHero compact crumb="/ koordinator / galerija" eyebrow="📷" title={t("gallery.title")} lead={t("gallery.lead")} />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/koordinator" className="text-sm font-semibold text-clay hover:text-clay-dark">
          ← {t("backToPanel")}
        </Link>

        {ok && (
          <p className="mt-5 rounded-xl border border-court/30 bg-court/8 px-4 py-3 text-sm font-semibold text-court-dark">
            ✅ {t(`ok.${ok}`)}
          </p>
        )}
        {greska && (
          <p className="mt-5 rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay-dark">{t(`err.${greska}`)}</p>
        )}

        <div className="mt-6">
          <UploadForm
            labels={{
              title: t("gallery.uploadTitle"),
              choose: t("gallery.caption"),
              upload: t("gallery.upload"),
              uploading: t("gallery.uploading"),
              error: t("gallery.uploadError"),
            }}
          />
        </div>

        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(photos ?? []).map((f) => (
            <li key={f.id} className="overflow-hidden rounded-2xl border border-line bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${STORAGE_BASE}${f.path}`}
                alt={f.naslov ?? ""}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-xs text-slate">{f.naslov ?? "—"}</span>
                <form action={deleteGalleryPhotoAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="photoId" value={f.id} />
                  <input type="hidden" name="path" value={f.path} />
                  <button type="submit" className="rounded px-2 py-1 text-xs font-semibold text-clay hover:bg-clay/10">
                    {t("gallery.delete")}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
