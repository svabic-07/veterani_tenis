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
