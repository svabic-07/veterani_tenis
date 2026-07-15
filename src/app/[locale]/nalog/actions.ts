"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Poveži prijavljeni nalog sa igračem (provere radi claim_player u bazi). */
export async function claimPlayer(formData: FormData) {
  const locale = String(formData.get("locale") ?? "sr");
  const playerId = String(formData.get("playerId") ?? "");
  if (!UUID_RE.test(playerId)) {
    redirect({ href: "/nalog?greska=zahtev", locale });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_player", { p_player_id: playerId });

  if (error) {
    const kod = error.message.includes("player_taken") ? "zauzet" : "povezivanje";
    redirect({ href: `/nalog?greska=${kod}`, locale });
  }

  revalidatePath("/", "layout");
  redirect({ href: "/nalog?povezan=1", locale });
}

const CATS = ["I", "II", "III", "IV", "V"] as const;
type Cat = (typeof CATS)[number];

/** Igrač podnosi zahtev za promenu kategorije (RPC proverava vlasništvo + dupli pending). */
export async function requestCategoryChangeAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "sr");
  const trazena = String(formData.get("trazena") ?? "") as Cat;
  const obrazlozenje = String(formData.get("obrazlozenje") ?? "")
    .trim()
    .slice(0, 500);

  if (!CATS.includes(trazena)) {
    redirect({ href: "/nalog?greska=zahtev", locale });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_category_change", {
    _trazena: trazena,
    _obrazlozenje: obrazlozenje,
  });

  if (error) {
    const MAP: Record<string, string> = {
      pending_exists: "vecPodnet",
      same_category: "istaKat",
      no_player: "nemaIgraca",
    };
    const kod = Object.keys(MAP).find((k) => error.message.includes(k));
    redirect({ href: `/nalog?greska=${kod ? MAP[kod] : "kategorija"}`, locale });
  }

  revalidatePath("/nalog");
  redirect({ href: "/nalog?katzahtev=1", locale });
}

/** Odjava. */
export async function signOut(formData: FormData) {
  const locale = String(formData.get("locale") ?? "sr");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: "/", locale });
}
