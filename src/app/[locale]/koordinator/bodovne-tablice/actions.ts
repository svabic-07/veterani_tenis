"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Batch izmena bodovnih tablica (RPC: is_staff + audit). */
export async function updateScoringTableAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "sr");
  const kostur = String(formData.get("kostur") ?? "32");

  const updates: { id: string; bodovi: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("b_")) continue;
    const id = key.slice(2);
    const n = Number(value);
    if (!UUID_RE.test(id) || !Number.isFinite(n) || n < 0) continue;
    updates.push({ id, bodovi: Math.round(n) });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_scoring_points", { _updates: updates });

  revalidatePath("/koordinator/bodovne-tablice");
  redirect({
    href: `/koordinator/bodovne-tablice?kostur=${kostur}&${error ? "greska=bodovi" : "ok=bodovi"}`,
    locale,
  });
}
