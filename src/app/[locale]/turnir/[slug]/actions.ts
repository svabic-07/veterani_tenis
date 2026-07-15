"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** player_id povezan sa nalogom, ili null ako nema sesije/profila. */
async function myPlayerId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("player_id")
    .eq("id", sub)
    .maybeSingle();
  return profile?.player_id ?? null;
}

/**
 * Samostalna prijava igrača u singl konkurenciju. Legalnost (singl, predstojeći
 * turnir, u roku, pre žreba, samo svoja prijava) proverava RLS — ovde samo
 * pokušamo upis i tiho ignorišemo odbijanje/duplikat.
 */
export async function selfEnterAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  if (!UUID_RE.test(eventId)) return;

  const supabase = await createClient();
  const playerId = await myPlayerId(supabase);
  if (!playerId) return;

  await supabase.from("entries").insert({
    event_id: eventId,
    player_id: playerId,
    status: "prijavljen",
  });

  revalidatePath("/[locale]/turnir/[slug]", "page");
}

/** Odjava sopstvene prijave (dok su prijave otvorene — RLS to čuva). */
export async function selfWithdrawAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  if (!UUID_RE.test(eventId)) return;

  const supabase = await createClient();
  const playerId = await myPlayerId(supabase);
  if (!playerId) return;

  await supabase
    .from("entries")
    .delete()
    .eq("event_id", eventId)
    .eq("player_id", playerId)
    .eq("status", "prijavljen");

  revalidatePath("/[locale]/turnir/[slug]", "page");
}
