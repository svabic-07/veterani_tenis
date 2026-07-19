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
  const direktorIme = String(formData.get("direktorIme") ?? "").trim().slice(0, 120) || null;

  if (!UUID_RE.test(turnirId)) back(formData, "greska=zahtev");

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_tournament_director", {
    _tournament_id: turnirId,
    _player_id: playerId as string, // funkcija prima NULL (skini sudiju)
    _direktor_ime: direktorIme as string, // funkcija prima NULL
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
  const domacin = String(formData.get("domacin") ?? "").trim().slice(0, 120) || null;
  const kontakt = String(formData.get("kontakt") ?? "").trim().slice(0, 80) || null;
  const lokacija = String(formData.get("lokacija") ?? "").trim().slice(0, 200) || null;
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

  const { data: created, error } = await supabase
    .from("tournaments")
    .insert({
      legacy_id: legacyId,
      naziv,
      serija,
      sistem,
      mesto: mesto || null,
      klub_id: UUID_RE.test(klubId) ? klubId : null,
      direktor_id: direktorId,
      direktor_ime: direktorIme,
      domacin,
      kontakt,
      lokacija,
      season_id: season?.id ?? null,
      datum_od: datumOd || null,
      datum_do: datumDo || null,
      rok_prijave: rok ? belgradeInputToIso(rok) : null,
      status: "najava",
    })
    .select("id")
    .single();

  if (error || !created) {
    back(formData, `greska=${error?.code === "23505" ? "postoji" : "turnir"}`);
    throw new Error("unreachable");
  }

  // Podrazumevane konkurencije po sistemu (singl); višak se briše na turniru.
  const kategorije =
    sistem === "kvalitativni"
      ? ["I", "II", "III", "IV", "V"]
      : ["30", "35", "40", "45", "50", "55", "60", "65", "70", "75"];
  const { error: evErr } = await supabase.from("tournament_events").insert(
    kategorije.map((kategorija) => ({
      turnir_id: created.id,
      kategorija,
      disciplina: "singl" as const,
    })),
  );
  if (evErr) {
    // ne ostavljaj turnir bez konkurencija — obriši pa prijavi grešku
    await supabase.from("tournaments").delete().eq("id", created.id);
    back(formData, "greska=turnir");
  }

  back(formData, `ok=turnir&slug=${legacyId}`);
}

/** Koordinator/admin: dodela ili oduzimanje sudijske uloge (RPC, audit). */
export async function setRefereeRoleAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const grant = formData.get("grant") === "1";
  if (!UUID_RE.test(userId)) back(formData, "greska=zahtev");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_referee_role", { _user_id: userId, _grant: grant });
  if (error) back(formData, "greska=uloga");
  back(formData, "ok=uloga");
}

function backTo(formData: FormData, path: string, query: string): never {
  const locale = String(formData.get("locale") ?? "sr");
  revalidatePath(path);
  redirect({ href: `${path}?${query}`, locale });
  throw new Error("unreachable");
}

/** Odobri/odbij zahtev za učlanjenje (RPC: kreira igrača + kontakt, audit). */
export async function resolveMembershipAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const approve = formData.get("approve") === "1";
  if (!UUID_RE.test(requestId)) back(formData, "greska=zahtev");

  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_membership_request", {
    _request_id: requestId,
    _approve: approve,
  });
  if (error) back(formData, "greska=uclanjenje");
  back(formData, `ok=${approve ? "uclanjenjeOdobreno" : "uclanjenjeOdbijeno"}`);
}

/** Nova sankcija (RLS: staff). */
export async function addSanctionAction(formData: FormData) {
  const playerId = String(formData.get("playerId") ?? "");
  const tip = String(formData.get("tip") ?? "");
  const razlog = String(formData.get("razlog") ?? "").trim().slice(0, 300) || null;
  const vaziDoRaw = String(formData.get("vaziDo") ?? "").trim();
  const vaziDo = /^\d{4}-\d{2}-\d{2}$/.test(vaziDoRaw) ? vaziDoRaw : null;
  const q = String(formData.get("q") ?? "");
  const backQ = q ? `&q=${encodeURIComponent(q)}` : "";

  if (!UUID_RE.test(playerId) || !["opomena", "oduzimanje_bodova", "suspenzija"].includes(tip)) {
    backTo(formData, "/koordinator/clanovi", `greska=zahtev${backQ}`);
  }

  const supabase = await createClient();
  const { data: me } = await supabase.auth.getClaims();
  const { error } = await supabase.from("sanctions").insert({
    player_id: playerId,
    tip,
    razlog,
    vazi_do: vaziDo,
    created_by: me?.claims?.sub ?? null,
  });
  if (error) backTo(formData, "/koordinator/clanovi", `greska=sankcija${backQ}`);
  backTo(formData, "/koordinator/clanovi", `ok=sankcija${backQ}`);
}

/** Ukidanje sankcije (RLS: staff). */
export async function deleteSanctionAction(formData: FormData) {
  const id = String(formData.get("sanctionId") ?? "");
  if (!UUID_RE.test(id)) backTo(formData, "/koordinator/clanovi", "greska=zahtev");
  const supabase = await createClient();
  const { error } = await supabase.from("sanctions").delete().eq("id", id);
  if (error) backTo(formData, "/koordinator/clanovi", "greska=sankcija");
  backTo(formData, "/koordinator/clanovi", "ok=sankcijaUklonjena");
}

/** Brisanje fotografije iz galerije (storage + metapodaci; RLS staff). */
export async function deleteGalleryPhotoAction(formData: FormData) {
  const id = String(formData.get("photoId") ?? "");
  const path = String(formData.get("path") ?? "").slice(0, 300);
  if (!UUID_RE.test(id) || !path || path.includes("..")) {
    backTo(formData, "/koordinator/galerija", "greska=zahtev");
  }
  const supabase = await createClient();
  await supabase.storage.from("galerija").remove([path]);
  const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
  if (error) backTo(formData, "/koordinator/galerija", "greska=galerija");
  revalidatePath("/galerija");
  backTo(formData, "/koordinator/galerija", "ok=galerijaObrisana");
}

/** Ručni preračun nedeljnog ranga (RPC: is_staff + audit); inače cron ponedeljkom. */
export async function recalcRankingsAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_recalc_rankings");
  if (error) back(formData, "greska=rang");
  revalidatePath("/rang-liste");
  back(formData, "ok=rang");
}

/** Novi klub (RLS: staff write). */
export async function addClubAction(formData: FormData) {
  const naziv = String(formData.get("naziv") ?? "").trim().slice(0, 120);
  const grad = String(formData.get("grad") ?? "").trim().slice(0, 80) || null;
  if (naziv.length < 2) backTo(formData, "/koordinator/klubovi", "greska=zahtev");

  const supabase = await createClient();
  const { error } = await supabase.from("clubs").insert({ naziv, grad });
  if (error) {
    backTo(formData, "/koordinator/klubovi", `greska=${error.code === "23505" ? "klubPostoji" : "klub"}`);
  }
  backTo(formData, "/koordinator/klubovi", "ok=klub");
}

/** Izmena kluba: naziv + grad (RLS: staff write) — grad puni autofill „Mesto" na turnirima. */
export async function updateClubCityAction(formData: FormData) {
  const klubId = String(formData.get("klubId") ?? "");
  const naziv = String(formData.get("naziv") ?? "").trim().slice(0, 120);
  const grad = String(formData.get("grad") ?? "").trim().slice(0, 80) || null;
  const q = String(formData.get("q") ?? "");
  if (!UUID_RE.test(klubId)) backTo(formData, "/koordinator/klubovi", "greska=zahtev");

  const supabase = await createClient();
  // naziv se menja samo ako je unet (prazno polje ne briše naziv)
  const { error } = await supabase
    .from("clubs")
    .update(naziv.length >= 2 ? { naziv, grad } : { grad })
    .eq("id", klubId);
  if (error) {
    backTo(formData, "/koordinator/klubovi", `greska=${error.code === "23505" ? "klubPostoji" : "klub"}`);
  }
  backTo(formData, "/koordinator/klubovi", `ok=grad${q ? `&q=${encodeURIComponent(q)}` : ""}`);
}

const KATEGORIJE = ["I", "II", "III", "IV", "V"] as const;

/** Novi igrač ili gost (RLS: staff write). Gost = legacy_id 'gost-…' (postojeći obrazac). */
export async function addPlayerAction(formData: FormData) {
  const ime = String(formData.get("ime") ?? "").trim().slice(0, 60);
  const prezime = String(formData.get("prezime") ?? "").trim().slice(0, 60);
  const godisteRaw = String(formData.get("godiste") ?? "").trim();
  const godiste = /^\d{4}$/.test(godisteRaw) ? Number(godisteRaw) : null;
  const klubId = String(formData.get("klubId") ?? "");
  const katRaw = String(formData.get("kategorija") ?? "");
  const kategorija = (KATEGORIJE as readonly string[]).includes(katRaw)
    ? (katRaw as (typeof KATEGORIJE)[number])
    : null;
  const gost = formData.get("gost") === "1";

  if (ime.length < 2 || prezime.length < 2) backTo(formData, "/koordinator/clanovi", "greska=zahtev");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .insert({
      ime,
      prezime,
      godiste,
      klub_id: UUID_RE.test(klubId) ? klubId : null,
      kategorija,
      legacy_id: gost ? `gost-${crypto.randomUUID().slice(0, 8)}` : null,
    })
    .select("id")
    .single();
  if (error || !data) backTo(formData, "/koordinator/clanovi", "greska=igrac");
  backTo(formData, "/koordinator/clanovi", `ok=${gost ? "gost" : "igrac"}`);
}

/** Izmena podataka igrača + kontakt — atomski RPC (is_staff + audit).
 *  Ime/prezime se menjaju samo ako su uneti (prazno polje ne briše). */
export async function updatePlayerAction(formData: FormData) {
  const playerId = String(formData.get("playerId") ?? "");
  const q = String(formData.get("q") ?? "").slice(0, 60);
  const backQ = q ? `&q=${encodeURIComponent(q)}` : "";
  if (!UUID_RE.test(playerId)) backTo(formData, "/koordinator/clanovi", `greska=zahtev${backQ}`);

  const ime = String(formData.get("ime") ?? "").trim().slice(0, 60);
  const prezime = String(formData.get("prezime") ?? "").trim().slice(0, 60);
  const godisteRaw = String(formData.get("godiste") ?? "").trim();
  const godiste = /^\d{4}$/.test(godisteRaw) ? Number(godisteRaw) : null;
  const klubId = String(formData.get("klubId") ?? "");
  const katRaw = String(formData.get("kategorija") ?? "");
  const kategorija = (KATEGORIJE as readonly string[]).includes(katRaw)
    ? (katRaw as (typeof KATEGORIJE)[number])
    : null;
  const aktivan = formData.get("aktivan") === "1";
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 120) || null;
  const telefon = String(formData.get("telefon") ?? "").trim().slice(0, 40) || null;

  const supabase = await createClient();
  // funkcija prima NULL za godište/klub/kategoriju/kontakt (tipovi ih generišu kao obavezne)
  const { error } = await supabase.rpc("admin_update_player", {
    _player_id: playerId,
    _ime: ime,
    _prezime: prezime,
    _godiste: godiste as number,
    _klub_id: (UUID_RE.test(klubId) ? klubId : null) as string,
    _kategorija: kategorija as NonNullable<typeof kategorija>,
    _is_active: aktivan,
    _email: email as string,
    _telefon: telefon as string,
  });
  if (error) backTo(formData, "/koordinator/clanovi", `greska=igrac${backQ}`);
  backTo(formData, "/koordinator/clanovi", `ok=izmena${backQ}`);
}

/** Spajanje duplikata igrača (RPC merge_players, audit). */
export async function mergePlayersAction(formData: FormData) {
  const keep = String(formData.get("keepId") ?? "");
  const dup = String(formData.get("dupId") ?? "");
  if (!UUID_RE.test(keep) || !UUID_RE.test(dup) || keep === dup) {
    backTo(formData, "/koordinator/clanovi", "greska=zahtev");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("merge_players", { _keep: keep, _dup: dup });
  if (error) {
    const kod = error.message.includes("dup_has_account") ? "dupNalog" : "spajanje";
    backTo(formData, "/koordinator/clanovi", `greska=${kod}`);
  }
  backTo(formData, "/koordinator/clanovi", "ok=spajanje");
}

/** Nova uplata (RLS: payments staff all). */
export async function addPaymentAction(formData: FormData) {
  const playerId = String(formData.get("playerId") ?? "");
  const tip = String(formData.get("tip") ?? "");
  const iznosRaw = String(formData.get("iznos") ?? "").replace(",", ".").trim();
  const iznos = Number(iznosRaw);
  const sezonaRaw = String(formData.get("sezona") ?? "").trim();
  const sezona = /^\d{4}$/.test(sezonaRaw) ? Number(sezonaRaw) : new Date().getFullYear();
  const napomena = String(formData.get("napomena") ?? "").trim().slice(0, 200) || null;

  if (
    !UUID_RE.test(playerId) ||
    !["clanarina", "kotizacija"].includes(tip) ||
    !Number.isFinite(iznos) ||
    iznos < 0
  ) {
    backTo(formData, "/koordinator/uplate", "greska=zahtev");
  }

  const supabase = await createClient();
  const { data: me } = await supabase.auth.getClaims();
  const { error } = await supabase.from("payments").insert({
    player_id: playerId,
    tip: tip as "clanarina" | "kotizacija",
    iznos,
    sezona,
    napomena,
    created_by: me?.claims?.sub ?? null,
  });
  if (error) backTo(formData, "/koordinator/uplate", "greska=uplata");
  backTo(formData, "/koordinator/uplate", "ok=uplata");
}

/** Brisanje uplate (RLS: staff). */
export async function deletePaymentAction(formData: FormData) {
  const id = String(formData.get("paymentId") ?? "");
  if (!UUID_RE.test(id)) backTo(formData, "/koordinator/uplate", "greska=zahtev");
  const supabase = await createClient();
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) backTo(formData, "/koordinator/uplate", "greska=uplata");
  backTo(formData, "/koordinator/uplate", "ok=uplataObrisana");
}

/** Nova vest (RLS: news staff all). */
export async function addNewsAction(formData: FormData) {
  const naslov = String(formData.get("naslov") ?? "").trim().slice(0, 160);
  const sadrzaj = String(formData.get("sadrzaj") ?? "").trim().slice(0, 8000);
  if (naslov.length < 3 || sadrzaj.length < 3) backTo(formData, "/koordinator/vesti", "greska=zahtev");

  const supabase = await createClient();
  const { data: me } = await supabase.auth.getClaims();
  const { error } = await supabase
    .from("news")
    .insert({ naslov, sadrzaj, autor: me?.claims?.sub ?? null });
  if (error) backTo(formData, "/koordinator/vesti", "greska=vest");
  revalidatePath("/vesti");
  backTo(formData, "/koordinator/vesti", "ok=vest");
}

/** Objavi/sakrij ili obriši vest (RLS: staff). */
export async function toggleNewsAction(formData: FormData) {
  const id = String(formData.get("newsId") ?? "");
  const mode = String(formData.get("mode") ?? "");
  if (!UUID_RE.test(id)) backTo(formData, "/koordinator/vesti", "greska=zahtev");

  const supabase = await createClient();
  const { error } =
    mode === "obrisi"
      ? await supabase.from("news").delete().eq("id", id)
      : await supabase.from("news").update({ objavljena: mode === "objavi" }).eq("id", id);
  if (error) backTo(formData, "/koordinator/vesti", "greska=vest");
  revalidatePath("/vesti");
  backTo(formData, "/koordinator/vesti", "ok=vestIzmena");
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
