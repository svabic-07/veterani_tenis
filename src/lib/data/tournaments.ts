import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";

/** Turnir sa domaćinom i direktorom — za javni kalendar/listu. */
export async function getTournaments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select(
      `id, legacy_id, naziv, serija, sistem, mesto, datum_od, datum_do, rok_prijave, status,
       clubs ( naziv, grad ),
       direktor:players!tournaments_direktor_id_fkey ( ime, prezime )`,
    )
    .order("datum_od", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export type TournamentListItem = Awaited<ReturnType<typeof getTournaments>>[number];

/** Jedan turnir sa domaćinom, direktorom i konkurencijama — po slug-u (legacy_id). */
export async function getTournamentBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select(
      `id, legacy_id, naziv, serija, sistem, mesto, lat, lng, datum_od, datum_do, rok_prijave, status,
       clubs ( naziv, grad ),
       direktor:players!tournaments_direktor_id_fkey ( ime, prezime ),
       tournament_events ( id, kategorija, disciplina )`,
    )
    .eq("legacy_id", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type TournamentDetail = NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>;

/** Naredni turniri (koji nisu završeni) — za početnu. Bez cookie-ja → keširano (ISR). */
export async function getUpcomingTournaments(limit = 3) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select(
      `id, legacy_id, naziv, serija, mesto, datum_od, datum_do, status,
       clubs ( naziv, grad )`,
    )
    .neq("status", "zavrsen")
    .order("datum_od", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export type UpcomingTournament = Awaited<ReturnType<typeof getUpcomingTournaments>>[number];

/** Brojači za hero statistiku (igrači, odigrani turniri). Keširano (anon). */
export async function getSiteStats() {
  const supabase = createPublicClient();
  const [players, tournaments] = await Promise.all([
    supabase.from("players").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("tournaments").select("id", { count: "exact", head: true }).eq("status", "zavrsen"),
  ]);
  return { players: players.count ?? 0, tournaments: tournaments.count ?? 0 };
}

/** Nedavno odigrani turniri (završeni) — za početnu, sa šampionima na kartici. */
export async function getRecentTournaments(limit = 3) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, legacy_id, naziv, serija, sistem, mesto, datum_od, datum_do, clubs ( naziv, grad )")
    .eq("status", "zavrsen")
    .order("datum_od", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export type TournamentWinner = {
  turnirId: string;
  kategorija: string;
  disciplina: string;
  ime: string;
  prezime: string;
  playerId: string;
};

/**
 * Pobednici (1. mesto) po konkurenciji za zadate turnire — za prikaz na
 * kartici turnira bez ulaska. Vraća mapu turnir_id → lista pobednika.
 */
export async function getWinnersForTournaments(
  ids: string[],
): Promise<Map<string, TournamentWinner[]>> {
  const map = new Map<string, TournamentWinner[]>();
  if (ids.length === 0) return map;

  const supabase = createPublicClient();
  const { data: pod, error } = await supabase
    .from("player_podiums")
    .select("turnir_id, kategorija, disciplina, player_id")
    .eq("mesto", 1)
    .in("turnir_id", ids);
  if (error) throw error;

  const rows = pod ?? [];
  const pids = [...new Set(rows.map((r) => r.player_id).filter((x): x is string => !!x))];
  const nameById = new Map<string, { ime: string; prezime: string }>();
  if (pids.length) {
    const { data: pl } = await supabase.from("players").select("id, ime, prezime").in("id", pids);
    for (const p of pl ?? []) nameById.set(p.id, { ime: p.ime, prezime: p.prezime });
  }

  const KAT_ORDER = ["I", "II", "III", "IV", "V"];
  const rank = (k: string) => {
    const i = KAT_ORDER.indexOf(k);
    return i >= 0 ? i : 100 + (Number.parseInt(k, 10) || 99);
  };

  for (const r of rows) {
    if (!r.turnir_id || !r.player_id || !r.kategorija || !r.disciplina) continue;
    const n = nameById.get(r.player_id);
    if (!n) continue;
    const list = map.get(r.turnir_id) ?? [];
    list.push({
      turnirId: r.turnir_id,
      kategorija: r.kategorija,
      disciplina: r.disciplina,
      ime: n.ime,
      prezime: n.prezime,
      playerId: r.player_id,
    });
    map.set(r.turnir_id, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => rank(a.kategorija) - rank(b.kategorija) || a.disciplina.localeCompare(b.disciplina));
  }
  return map;
}
