import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/supabase/types";

type Discipline = Database["public"]["Enums"]["discipline"];

/** Rang lista za kategoriju × disciplinu (poslednja obračunska nedelja). */
export async function getRankings(opts: { kategorija: string; disciplina: Discipline }) {
  const supabase = createPublicClient();

  const { data: latest, error: e1 } = await supabase
    .from("rankings")
    .select("nedelja")
    .eq("kategorija", opts.kategorija)
    .eq("disciplina", opts.disciplina)
    .order("nedelja", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (e1) throw e1;
  if (!latest) return { week: null as string | null, rows: [] };

  const { data, error } = await supabase
    .from("rankings")
    .select(
      "mesto, bodovi, broj_turnira, players ( id, ime, prezime, drzava, clubs ( naziv ) )",
    )
    .eq("kategorija", opts.kategorija)
    .eq("disciplina", opts.disciplina)
    .eq("nedelja", latest.nedelja)
    .order("mesto", { ascending: true });
  if (error) throw error;

  return { week: latest.nedelja, rows: data ?? [] };
}

export type RankingRow = Awaited<ReturnType<typeof getRankings>>["rows"][number];
