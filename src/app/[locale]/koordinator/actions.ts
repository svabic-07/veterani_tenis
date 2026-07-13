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
  const direktorIme = String(formData.get("direktorIme") ?? "")
    .replace(/[,()%*]/g, "")
    .trim();
  const datumOd = String(formData.get("datumOd") ?? "");
  const datumDo = String(formData.get("datumDo") ?? "");
  const rok = String(formData.get("rok") ?? "");

  if (naziv.length < 3 || !SERIES.includes(serija) || !SYSTEMS.includes(sistem)) {
    back(formData, "greska=zahtev");
  }

  const supabase = await createClient();

  // direktor po imenu — mora biti jednoznačan pogodak
  let direktorId: string | null = null;
  if (direktorIme) {
    const [ime, ...rest] = direktorIme.split(/\s+/);
    const prezime = rest.join(" ");
    let dq = supabase.from("players").select("id").eq("is_active", true).limit(3);
    dq = prezime
      ? dq.ilike("ime", `${ime}%`).ilike("prezime", `${prezime}%`)
      : dq.or(`ime.ilike.%${ime}%,prezime.ilike.%${ime}%`);
    const { data: kandidati } = await dq;
    if (!kandidati || kandidati.length !== 1) back(formData, "greska=direktor");
    direktorId = kandidati[0].id;
  }

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
