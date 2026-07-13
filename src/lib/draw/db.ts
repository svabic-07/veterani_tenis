import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { DrawEntry, DrawMatch, GeneratedDraw } from "./types";
import { generateDraw } from "./index";
import { computeGroupStandings, isGroupComplete } from "./groups";

/**
 * DB operacije žreba (Faza 3 · sudijski portal).
 * Sve ide kroz prosleđeni Supabase klijent — RLS je poslednja linija odbrane
 * (piše samo staff ili direktor turnira preko can_manage_event politika).
 */

type Db = SupabaseClient<Database>;

export class DrawError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

/** Kreira RADNI žreb iz prijava konkurencije. Postojeći radni žreb se zamenjuje. */
export async function createDrawForEvent(supabase: Db, eventId: string) {
  const { data: existing } = await supabase
    .from("draws")
    .select("id, status")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existing && existing.status !== "radna" && existing.status !== "opozvan") {
    throw new DrawError("draw_published");
  }

  const { data: entryRows, error: e1 } = await supabase
    .from("entries")
    .select("player_id, bodovi_snapshot, status, players!entries_player_id_fkey ( klub_id )")
    .eq("event_id", eventId)
    .in("status", ["prijavljen", "gost"]);
  if (e1) throw e1;

  const entries: DrawEntry[] = (entryRows ?? []).map((r) => ({
    id: r.player_id,
    points: r.bodovi_snapshot,
    clubId: r.players?.klub_id ?? null,
  }));
  if (entries.length < 3) throw new DrawError("not_enough_entries");

  const rngSeed = randomUUID();
  const draw = generateDraw(entries, rngSeed);

  if (existing) {
    const { error } = await supabase.from("draws").delete().eq("id", existing.id);
    if (error) throw error;
  }

  const drawId = randomUUID();
  const { error: e2 } = await supabase.from("draws").insert({
    id: drawId,
    event_id: eventId,
    tip: draw.tip,
    kostur: draw.kostur,
    broj_nosilaca: draw.brojNosilaca,
    status: "radna",
    rng_seed: rngSeed,
    seed_izvor: draw.seeds.map((s, i) => ({ seed: i + 1, player_id: s.id, bodovi: s.points })),
  });
  if (e2) throw e2;

  const matchIds = new Map<string, string>();
  for (const m of draw.matches) matchIds.set(`${m.round}:${m.position}`, randomUUID());

  const { error: e3 } = await supabase.from("matches").insert(
    draw.matches.map((m) => ({
      id: matchIds.get(`${m.round}:${m.position}`)!,
      draw_id: drawId,
      kolo: m.round,
      pozicija: m.position,
      grupa: m.group ?? null,
      player1_id: m.p1?.id ?? null,
      player2_id: m.p2?.id ?? null,
      seed1: m.seed1 ?? null,
      seed2: m.seed2 ?? null,
      status: m.status === "bye" ? ("bye" as const) : ("zakazan" as const),
      winner_slot: m.winnerSlot ?? null,
      next_match_id: m.next ? matchIds.get(`${m.next.round}:${m.next.position}`)! : null,
      next_slot: m.next?.slot ?? null,
    })),
  );
  if (e3) throw e3;

  // upiši dodeljene nosioce u prijave (snapshot)
  for (let i = 0; i < draw.seeds.length; i++) {
    await supabase
      .from("entries")
      .update({ seed: i + 1 })
      .eq("event_id", eventId)
      .eq("player_id", draw.seeds[i].id);
  }

  return drawId;
}

/** Objava radnog žreba (radna → objavljen). */
export async function publishDraw(supabase: Db, drawId: string) {
  const { data, error } = await supabase
    .from("draws")
    .update({ status: "objavljen" })
    .eq("id", drawId)
    .eq("status", "radna")
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new DrawError("not_working_draw");
}

/** Brisanje radnog žreba (za ponovni žreb pre objave). */
export async function discardDraw(supabase: Db, drawId: string) {
  const { data, error } = await supabase
    .from("draws")
    .delete()
    .eq("id", drawId)
    .eq("status", "radna")
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new DrawError("not_working_draw");
}

export type ResultInput = {
  winnerSlot: 1 | 2;
  status: "zavrsen" | "walkover" | "predaja" | "retiranje";
  sets: { g1: number; g2: number }[];
};

/**
 * Unos rezultata + auto-napredovanje pobednika; po završetku grupa
 * popunjava polufinala (grupa5 / dve grupe).
 */
export async function enterResult(supabase: Db, matchId: string, result: ResultInput) {
  const { data: match, error: e1 } = await supabase
    .from("matches")
    .select("id, draw_id, kolo, grupa, player1_id, player2_id, seed1, seed2, winner_slot, status, next_match_id, next_slot")
    .eq("id", matchId)
    .maybeSingle();
  if (e1) throw e1;
  if (!match) throw new DrawError("match_not_found");
  if (match.winner_slot !== null) throw new DrawError("match_resolved");
  if (!match.player1_id || !match.player2_id) throw new DrawError("match_incomplete");
  if (result.status === "zavrsen" && result.sets.length === 0) throw new DrawError("sets_required");

  const { error: e2 } = await supabase
    .from("matches")
    .update({ winner_slot: result.winnerSlot, status: result.status })
    .eq("id", matchId);
  if (e2) throw e2;

  if (result.sets.length > 0) {
    const { error } = await supabase.from("match_sets").insert(
      result.sets.map((s, i) => ({ match_id: matchId, set_no: i + 1, gem1: s.g1, gem2: s.g2 })),
    );
    if (error) throw error;
  }

  // propagacija u sledeće kolo
  if (match.next_match_id && match.next_slot) {
    const winnerId = result.winnerSlot === 1 ? match.player1_id : match.player2_id;
    const winnerSeed = result.winnerSlot === 1 ? match.seed1 : match.seed2;
    const patch =
      match.next_slot === 1
        ? { player1_id: winnerId, seed1: winnerSeed }
        : { player2_id: winnerId, seed2: winnerSeed };
    const { error } = await supabase.from("matches").update(patch).eq("id", match.next_match_id);
    if (error) throw error;
  }

  // razrešenje grupa → polufinala
  if (match.kolo === 0 && match.grupa) {
    await resolveGroupsIfComplete(supabase, match.draw_id);
  }
}

/** Mapira DB mečeve u engine oblik (za plasman u grupi). */
function toDrawMatches(
  rows: {
    kolo: number;
    pozicija: number;
    grupa: string | null;
    player1_id: string | null;
    player2_id: string | null;
    winner_slot: number | null;
    match_sets: { set_no: number; gem1: number; gem2: number }[];
  }[],
): DrawMatch[] {
  const entry = (id: string | null): DrawEntry | null => (id ? { id, points: null } : null);
  return rows.map((r) => ({
    round: r.kolo,
    position: r.pozicija,
    group: r.grupa ?? undefined,
    p1: entry(r.player1_id),
    p2: entry(r.player2_id),
    status: "zakazan",
    winnerSlot: (r.winner_slot ?? undefined) as 1 | 2 | undefined,
    sets: r.match_sets
      .toSorted((a, b) => a.set_no - b.set_no)
      .map((s) => ({ g1: s.gem1, g2: s.gem2 })),
  }));
}

async function resolveGroupsIfComplete(supabase: Db, drawId: string) {
  const { data: draw, error: e1 } = await supabase
    .from("draws")
    .select(
      "id, tip, matches ( id, kolo, pozicija, grupa, player1_id, player2_id, winner_slot, match_sets ( set_no, gem1, gem2 ) )",
    )
    .eq("id", drawId)
    .maybeSingle();
  if (e1) throw e1;
  if (!draw || (draw.tip !== "grupa5" && draw.tip !== "grupa")) return;

  const dm = toDrawMatches(draw.matches);
  const sf1 = draw.matches.find((m) => m.kolo === 1 && m.pozicija === 1);
  const sf2 = draw.matches.find((m) => m.kolo === 1 && m.pozicija === 2);
  if (!sf1 || !sf2) return; // čista grupa 3–4, nema završnice

  if (draw.tip === "grupa5") {
    if (!isGroupComplete(dm, "G")) return;
    const st = computeGroupStandings(dm, "G");
    // PF1: N1 vs 2. iz grupe · PF2: N2 vs 1. iz grupe
    await supabase.from("matches").update({ player2_id: st[1]?.entry.id ?? null }).eq("id", sf1.id);
    await supabase.from("matches").update({ player2_id: st[0]?.entry.id ?? null }).eq("id", sf2.id);
  } else {
    if (!isGroupComplete(dm, "A") || !isGroupComplete(dm, "B")) return;
    const a = computeGroupStandings(dm, "A");
    const b = computeGroupStandings(dm, "B");
    // PF1: A1 vs B2 · PF2: B1 vs A2
    await supabase
      .from("matches")
      .update({ player1_id: a[0]?.entry.id ?? null, player2_id: b[1]?.entry.id ?? null })
      .eq("id", sf1.id);
    await supabase
      .from("matches")
      .update({ player1_id: b[0]?.entry.id ?? null, player2_id: a[1]?.entry.id ?? null })
      .eq("id", sf2.id);
  }
}

/** Parsira rezultat "6:3 7:5" (ili "6-3, 7-6") u setove. */
export function parseSets(text: string): { g1: number; g2: number }[] {
  const sets: { g1: number; g2: number }[] = [];
  for (const m of text.matchAll(/(\d{1,2})\s*[:\-]\s*(\d{1,2})/g)) {
    sets.push({ g1: Number(m[1]), g2: Number(m[2]) });
  }
  return sets;
}

export type { GeneratedDraw };
