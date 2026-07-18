"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { belgradeInputToIso } from "@/lib/format";
import type { Database } from "@/lib/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type Series = Database["public"]["Enums"]["tournament_series"];
type System = Database["public"]["Enums"]["competition_system"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES: AppRole[] = ["igrac", "sudija", "koordinator", "admin"];
const SERIES: Series[] = ["s2000", "s1000", "s500", "s250", "master"];
const SYSTEMS: System[] = ["kvalitativni", "starosni"];

function back(formData: FormData, query: string): never {
  const locale = String(formData.get("locale") ?? "sr");
  revalidatePath("/koordinator");
  redirect({ href: `/koordinator?${query}`, locale });
  throw new Error("unreachable"); // redirect baca NEXT_REDIRECT
}

/** Dodela/oduzimanje uloge (RLS: sme samo admin). */
export async function toggleRoleAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as AppRole;
  const grant = formData.get("grant") === "1";

  if (!UUID_RE.test(userId) || !ROLES.includes(role)) back(formData, "greska=zahtev");

  const supabase = await createClient();
  const { data: me } = await supabase.auth.getClaims();
  if (!me?.claims) back(formData, "greska=auth");
  if (!grant && userId === me.claims.sub && role === "admin") {
    back(formData, "greska=samoodbrana"); // admin ne može sebi da skine admin
  }

  if (grant) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) back(formData, `greska=${error.code === "23505" ? "vec_ima" : "uloga"}`);
  } else {
    const { data, error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role)
      .select("id");
    if (error || !data?.length) back(formData, "greska=uloga");
  }
  back(formData, "ok=uloga");
}

/** Dodela/skidanje sudije (direktora) turniru (RPC: is_staff + audit). */
export async function assignRefereeAction(formData: FormData) {
  const turnirId = String(formData.get("turnirId") ?? "");
  const playerRaw = String(formData.get("playerId") ?? "");
  const playerId = UUID_RE.test(playerRaw) ? playerRaw : null;

  if (!UUID_RE.test(turnirId)) back(formData, "greska=zahtev");

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_tournament_director", {
    _tournament_id: turnirId,
    // Funkcija prima NULL (skini sudiju); generisani tip je ne-null (param bez defaulta).
    _player_id: playerId as string,
  });
  if (error) back(formData, "greska=sudija");
  back(formData, "ok=sudija");
}

/** Odobri/odbij zahtev za promenu kategorije (RPC: is_staff + audit). */
export async function resolveCategoryAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const approve = formData.get("approve") === "1";

  if (!UUID_RE.test(requestId)) back(formData, "greska=zahtev");

  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_category_change", {
    _request_id: requestId,
    _approve: approve,
  });
  if (error) back(formData, "greska=kategorija");
  back(formData, `ok=${approve ? "kategorijaOdobrena" : "kategorijaOdbijena"}`);
}

function slugify(name: string): string {
  const FOLD: Record<string, string> = { č: "c", ć: "c", š: "s", ž: "z", đ: "dj" };
  return (
    name
      .toLowerCase()
      .replace(/[čćšžđ]/g, (ch) => FOLD[ch] ?? ch)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "") || "turnir"
  );
}

/** Novi turnir (staff; RLS „tournaments: staff write"). */
export async function createTournamentAction(formData: FormData) {
  const naziv = String(formData.get("naziv") ?? "").trim();
  const serija = String(formData.get("serija") ?? "") as Series;
  const sistem = String(formData.get("sistem") ?? "") as System;
  const mesto = String(formData.get("mesto") ?? "").trim();
  const klubId = String(formData.get("klubId") ?? "");
  const direktorRaw = String(formData.get("direktorId") ?? "");
  const direktorId = UUID_RE.test(direktorRaw) ? direktorRaw : null;
  const direktorIme = String(formData.get("direktorIme") ?? "").trim().slice(0, 120) || null;
  const datumOd = String(formData.get("datumOd") ?? "");
  const datumDo = String(formData.get("datumDo") ?? "");
  const rok = String(formData.get("rok") ?? "");

  if (naziv.length < 3 || !SERIES.includes(serija) || !SYSTEMS.includes(sistem)) {
    back(formData, "greska=zahtev");
  }

  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id, pocetak")
    .eq("aktivna", true)
    .maybeSingle();

  const year = (datumOd || season?.pocetak || new Date().toISOString()).slice(0, 4);
  const legacyId = `${slugify(naziv)}-${year}`;

  const { error } = await supabase.from("tournaments").insert({
    legacy_id: legacyId,
    naziv,
    serija,
    sistem,
    mesto: mesto || null,
    klub_id: UUID_RE.test(klubId) ? klubId : null,
    direktor_id: direktorId,
    direktor_ime: direktorIme,
    season_id: season?.id ?? null,
    datum_od: datumOd || null,
    datum_do: datumDo || null,
    rok_prijave: rok ? belgradeInputToIso(rok) : null,
    status: "najava",
  });

  if (error) {
    back(formData, `greska=${error.code === "23505" ? "postoji" : "turnir"}`);
  }
  back(formData, `ok=turnir&slug=${legacyId}`);
}

/** Pretraga igrača za izbor direktora (padajući meni; staff). */
export async function searchDirectorsAction(
  query: string,
): Promise<{ id: string; name: string; klub: string | null }[]> {
  const words = query
    .replace(/[,()*%:.]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (words.length === 0) return [];

  const supabase = await createClient();
  const { data: staff } = await supabase.rpc("is_staff");
  if (!staff) return [];

  let dq = supabase
    .from("players")
    .select("id, ime, prezime, clubs ( naziv )")
    .eq("is_active", true)
    .order("prezime")
    .limit(8);
  if (words.length >= 2) {
    const [a, b] = [words[0], words.slice(1).join(" ")];
    dq = dq.or(
      `and(ime.ilike.${a}*,prezime.ilike.${b}*),and(ime.ilike.${b}*,prezime.ilike.${a}*)`,
    );
  } else {
    dq = dq.or(`ime.ilike.*${words[0]}*,prezime.ilike.*${words[0]}*`);
  }
  const { data } = await dq;
  return (data ?? []).map((p) => ({
    id: p.id,
    name: `${p.ime} ${p.prezime}`,
    klub: p.clubs?.naziv ?? null,
  }));
}
