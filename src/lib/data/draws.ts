import { createClient } from "@/lib/supabase/server";

/**
 * Objavljeni žrebovi turnira sa mečevima, igračima i setovima.
 * RLS pušta anon samo na status objavljen/zaključan — nema dodatnog filtera.
 */
export async function getDrawsForTournament(tournamentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("draws")
    .select(
      `id, tip, kostur, broj_nosilaca, status,
       event:tournament_events!inner ( id, kategorija, disciplina, turnir_id ),
       matches (
         id, kolo, pozicija, grupa, seed1, seed2, status, winner_slot, termin, teren,
         p1:players!matches_player1_id_fkey ( id, ime, prezime ),
         p2:players!matches_player2_id_fkey ( id, ime, prezime ),
         partner1:players!matches_partner1_id_fkey ( id, ime, prezime ),
         partner2:players!matches_partner2_id_fkey ( id, ime, prezime ),
         match_sets ( set_no, gem1, gem2, tb1, tb2 )
       )`,
    )
    .eq("tournament_events.turnir_id", tournamentId)
    .order("kolo", { referencedTable: "matches", ascending: true })
    .order("pozicija", { referencedTable: "matches", ascending: true });

  if (error) throw error;
  return data ?? [];
}

export type TournamentDraw = Awaited<ReturnType<typeof getDrawsForTournament>>[number];
export type DrawMatchRow = TournamentDraw["matches"][number];
