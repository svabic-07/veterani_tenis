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
