"use client";

import { useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

/** Upload fotografija u storage bucket 'galerija' + upis metapodataka.
 *  Klijentski, jer server akcije ne primaju velike fajlove elegantno. */
export function UploadForm({
  labels,
}: Readonly<{
  labels: { title: string; choose: string; upload: string; uploading: string; error: string };
}>) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [naslov, setNaslov] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  async function upload() {
    const files = fileRef.current?.files;
    if (!files || files.length === 0) return;
    setBusy(true);
    setErr(false);
    const supabase = createClient();
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("galerija").upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type || undefined,
        });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase
          .from("gallery_photos")
          .insert({ path, naslov: naslov.trim() || null });
        if (dbErr) throw dbErr;
      }
      if (fileRef.current) fileRef.current.value = "";
      setNaslov("");
      router.refresh();
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h2 className="font-display text-lg font-bold text-navy">{labels.title}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="text-sm"
          aria-label={labels.choose}
        />
        <input
          type="text"
          value={naslov}
          onChange={(e) => setNaslov(e.target.value)}
          placeholder={labels.choose}
          maxLength={160}
          className="min-w-0 flex-1 basis-52 rounded-xl border border-line2 bg-bg px-3 py-2 text-sm outline-none focus:border-clay"
        />
        <button
          type="button"
          onClick={upload}
          disabled={busy}
          className="rounded-xl bg-clay px-4 py-2 text-sm font-semibold text-white transition hover:bg-clay-dark disabled:opacity-50"
        >
          {busy ? labels.uploading : labels.upload}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-clay-dark">{labels.error}</p>}
    </div>
  );
}
