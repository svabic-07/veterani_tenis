import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/supabase/types";

type QualityCategory = Database["public"]["Enums"]["quality_category"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Direktorijum igrača — pretraga po imenu + filter po kategoriji. */
export async function searchPlayers(opts: {
  q?: string;
  kategorija?: string;
  limit?: number;
}) {
  const supabase = createPublicClient();
  let query = supabase
    .from("players")
    .select("id, ime, prezime, kategorija, drzava, godiste, clubs ( naziv, grad )", {
      count: "exact",
    })
    .eq("is_active", true)
    .order("prezime", { ascending: true })
    .order("ime", { ascending: true })
    .limit(opts.limit ?? 60);

  const q = opts.q?.replace(/[,()%*]/g, "").trim();
  if (q) query = query.or(`ime.ilike.%${q}%,prezime.ilike.%${q}%`);
  if (opts.kategorija) query = query.eq("kategorija", opts.kategorija as QualityCategory);

  const { data, error, count } = await query;
  if (error) throw error;
  return { players: data ?? [], count: count ?? 0 };
}

export type PlayerListItem = Awaited<ReturnType<typeof searchPlayers>>["players"][number];

/** Top N rang liste za kat × disc (poslednja obračunska nedelja) — za početnu/preglede. */
export async function getTopRankings(kategorija: string, disciplina: string, limit = 5) {
  const supabase = createPublicClient();
  const { data: last } = await supabase
    .from("rankings")
    .select("nedelja")
    .eq("kategorija", kategorija)
    .eq("disciplina", disciplina as Database["public"]["Enums"]["discipline"])
    .order("nedelja", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last) return [];

  const { data, error } = await supabase
    .from("rankings")
    .select("mesto, bodovi, broj_turnira, players ( id, ime, prezime, clubs ( naziv ) )")
    .eq("kategorija", kategorija)
    .eq("disciplina", disciplina as Database["public"]["Enums"]["discipline"])
    .eq("nedelja", last.nedelja)
    .order("mesto", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Aktuelne rang pozicije igrača (poslednja obračunska nedelja po kat × disc). */
export async function getPlayerRankings(playerId: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("rankings")
    .select("kategorija, disciplina, bodovi, mesto, broj_turnira, nedelja")
    .eq("player_id", playerId)
    .order("nedelja", { ascending: false });
  if (error) throw error;

  const latest = new Map<string, NonNullable<typeof data>[number]>();
  for (const r of data ?? []) {
    const k = `${r.kategorija}|${r.disciplina}`;
    if (!latest.has(k)) latest.set(k, r);
  }
  return [...latest.values()].sort((a, b) => b.bodovi - a.bodovi);
}

/** Istorija turnira igrača (osvojeni bodovi po turniru). */
export async function getPlayerHistory(playerId: string, limit = 40) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("ranking_points")
    .select(
      "bodovi, kategorija, disciplina, aktivno_do, tournaments ( naziv, legacy_id, datum_od )",
    )
    .eq("player_id", playerId)
    .limit(300);
  if (error) throw error;
  return (data ?? [])
    .sort((a, b) =>
      (b.tournaments?.datum_od ?? "") < (a.tournaments?.datum_od ?? "") ? -1 : 1,
    )
    .slice(0, limit);
}

/** Poslednji mečevi igrača (objavljeni/zaključani žrebovi). */
export async function getPlayerMatches(playerId: string, limit = 15) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      `id, kolo, pozicija, status, winner_slot,
       p1:players!matches_player1_id_fkey ( id, ime, prezime ),
       p2:players!matches_player2_id_fkey ( id, ime, prezime ),
       match_sets ( set_no, gem1, gem2 ),
       draws!inner (
         event:tournament_events!inner (
           kategorija, disciplina,
           turnir:tournaments!inner ( naziv, legacy_id, datum_od )
         )
       )`,
    )
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .not("winner_slot", "is", null)
    .limit(400);
  if (error) throw error;
  return (data ?? [])
    .sort((a, b) => {
      const da = a.draws.event.turnir.datum_od ?? "";
      const db = b.draws.event.turnir.datum_od ?? "";
      if (da !== db) return da < db ? 1 : -1;
      return b.kolo - a.kolo;
    })
    .slice(0, limit);
}

export type PlayerTrophy = {
  mesto: number;
  kategorija: string;
  disciplina: string;
  naziv: string;
  slug: string | null;
  datum: string | null;
};

/** Trofeji igrača — plasmani 1/2/3. mesto po turniru (za profil). */
export async function getPlayerTrophies(playerId: string): Promise<{
  brojevi: { prvo: number; drugo: number; trece: number };
  lista: PlayerTrophy[];
}> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("player_podiums")
    .select("mesto, kategorija, disciplina, turnir_id")
    .eq("player_id", playerId);
  if (error) throw error;
  const rows = data ?? [];

  const tids = [...new Set(rows.map((r) => r.turnir_id).filter((x): x is string => !!x))];
  const tourById = new Map<string, { naziv: string; slug: string | null; datum: string | null }>();
  if (tids.length) {
    const { data: ts } = await supabase
      .from("tournaments")
      .select("id, naziv, legacy_id, datum_od")
      .in("id", tids);
    for (const t of ts ?? []) {
      tourById.set(t.id, { naziv: t.naziv, slug: t.legacy_id, datum: t.datum_od });
    }
  }

  const lista: PlayerTrophy[] = [];
  const brojevi = { prvo: 0, drugo: 0, trece: 0 };
  for (const r of rows) {
    if (!r.turnir_id || !r.mesto || !r.kategorija || !r.disciplina) continue;
    const t = tourById.get(r.turnir_id);
    if (!t) continue;
    lista.push({
      mesto: r.mesto,
      kategorija: r.kategorija,
      disciplina: r.disciplina,
      naziv: t.naziv,
      slug: t.slug,
      datum: t.datum,
    });
    if (r.mesto === 1) brojevi.prvo++;
    else if (r.mesto === 2) brojevi.drugo++;
    else if (r.mesto === 3) brojevi.trece++;
  }
  lista.sort((a, b) => a.mesto - b.mesto || (b.datum ?? "").localeCompare(a.datum ?? ""));
  return { brojevi, lista };
}

/** Jedan igrač po id-u (uuid). Vraća null ako ne postoji ili id nije validan. */
export async function getPlayerById(id: string) {
  if (!UUID_RE.test(id)) return null;
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("players")
    .select(
      "id, ime, prezime, kategorija, drzava, godiste, itf_ipin, foto_url, clubs ( naziv, grad )",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
