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
export async function createDrawForEvent(
  supabase: Db,
  eventId: string,
  opts?: { svakSaSvakim?: boolean },
) {
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
    .select("player_id, bodovi_snapshot, seed, status, players!entries_player_id_fkey ( klub_id )")
    .eq("event_id", eventId)
    .in("status", ["prijavljen", "gost"]);
  if (e1) throw e1;

  // Ručno označeni nosioci (entries.seed pre žreba) imaju prednost: dobijaju
  // veštački visoke bodove (1e9 - seed) pa ih engine nosi tim redom; ostatak
  // nosilačkih mesta (i sve bez oznake) ide po bodovima kao i do sad.
  const MANUAL = 1_000_000_000;
  const realPoints = new Map<string, number | null>();
  const entries: DrawEntry[] = (entryRows ?? []).map((r) => {
    realPoints.set(r.player_id, r.bodovi_snapshot);
    return {
      id: r.player_id,
      points: r.seed != null && r.seed > 0 ? MANUAL - r.seed : r.bodovi_snapshot,
      clubId: r.players?.klub_id ?? null,
    };
  });
  if (entries.length < 3) throw new DrawError("not_enough_entries");
  if (opts?.svakSaSvakim && entries.length > 8) throw new DrawError("rr_too_many");

  const rngSeed = randomUUID();
  const draw = generateDraw(entries, rngSeed, { forceRoundRobin: opts?.svakSaSvakim });

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
    seed_izvor: draw.seeds.map((s, i) => ({
      seed: i + 1,
      player_id: s.id,
      bodovi: realPoints.get(s.id) ?? null,
      rucni: s.points !== null && s.points >= MANUAL - 1000,
    })),
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

/** Dodaje prijavu; bodovi za nošenje iz poslednje rang liste (ako postoji). */
export async function addEntry(supabase: Db, eventId: string, playerId: string) {
  const { data: existingDraw } = await supabase
    .from("draws")
    .select("status")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existingDraw && existingDraw.status !== "radna" && existingDraw.status !== "opozvan") {
    throw new DrawError("draw_published");
  }

  const { data: event } = await supabase
    .from("tournament_events")
    .select("kategorija, disciplina")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) throw new DrawError("bad_request");

  const { data: rank } = await supabase
    .from("rankings")
    .select("bodovi")
    .eq("player_id", playerId)
    .eq("kategorija", event.kategorija)
    .eq("disciplina", event.disciplina)
    .order("nedelja", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("entries").insert({
    event_id: eventId,
    player_id: playerId,
    status: "prijavljen",
    bodovi_snapshot: rank?.bodovi ?? null,
  });
  if (error) {
    if (error.code === "23505") throw new DrawError("already_entered");
    throw error;
  }
}

/** Uklanja prijavu (samo dok žreb nije objavljen). */
export async function removeEntry(supabase: Db, entryId: string) {
  const { data: entry } = await supabase
    .from("entries")
    .select("id, event_id")
    .eq("id", entryId)
    .maybeSingle();
  if (!entry) throw new DrawError("bad_request");

  const { data: existingDraw } = await supabase
    .from("draws")
    .select("status")
    .eq("event_id", entry.event_id)
    .maybeSingle();
  if (existingDraw && existingDraw.status !== "radna" && existingDraw.status !== "opozvan") {
    throw new DrawError("draw_published");
  }

  const { error } = await supabase.from("entries").delete().eq("id", entryId);
  if (error) throw error;
}

/** Satnica: termin i teren jednog meča. */
export async function scheduleMatch(
  supabase: Db,
  matchId: string,
  termin: string | null,
  teren: string | null,
) {
  const { data, error } = await supabase
    .from("matches")
    .update({ termin, teren })
    .eq("id", matchId)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new DrawError("match_not_found");
}

/**
 * Ručno doterivanje RADNOG eliminacionog žreba: zamena igrača na dve
 * pozicije 1. kola/predkola (nosioci i bodovi idu sa pozicijom — menjaju
 * se samo igrači). Bye mečevi se ponovo propagiraju u 2. kolo.
 */
export async function swapSlots(
  supabase: Db,
  drawId: string,
  a: { matchId: string; slot: 1 | 2 },
  b: { matchId: string; slot: 1 | 2 },
) {
  if (a.matchId === b.matchId && a.slot === b.slot) throw new DrawError("bad_request");

  const { data: draw } = await supabase
    .from("draws")
    .select("id, status, tip, matches ( id, kolo, pozicija, player1_id, player2_id, status, next_match_id, next_slot )")
    .eq("id", drawId)
    .maybeSingle();
  if (!draw) throw new DrawError("bad_request");
  if (draw.status !== "radna") throw new DrawError("not_working_draw");
  if (draw.tip !== "eliminacija") throw new DrawError("swap_elimination_only");

  const mA = draw.matches.find((m) => m.id === a.matchId);
  const mB = draw.matches.find((m) => m.id === b.matchId);
  if (!mA || !mB || mA.kolo > 1 || mB.kolo > 1) throw new DrawError("bad_request");

  const get = (m: typeof mA, slot: 1 | 2) => (slot === 1 ? m.player1_id : m.player2_id);
  const pA = get(mA, a.slot);
  const pB = get(mB, b.slot);
  if (!pA && !pB) throw new DrawError("bad_request"); // bye ↔ bye nema smisla

  const set = async (m: typeof mA, slot: 1 | 2, playerId: string | null) => {
    const patch = slot === 1 ? { player1_id: playerId } : { player2_id: playerId };
    const { error } = await supabase.from("matches").update(patch).eq("id", m.id);
    if (error) throw error;
  };
  await set(mA, a.slot, pB);
  await set(mB, b.slot, pA);

  // bye mečevi: ponovo propagiraj igrača (sveže stanje posle zamene) u 2. kolo
  for (const m of [mA, mB]) {
    if (m.status !== "bye" || !m.next_match_id || !m.next_slot) continue;
    const { data: fresh } = await supabase
      .from("matches")
      .select("player1_id, player2_id, winner_slot")
      .eq("id", m.id)
      .single();
    if (!fresh) continue;
    const byeWinner = fresh.winner_slot === 1 ? fresh.player1_id : fresh.player2_id;
    const patch = m.next_slot === 1 ? { player1_id: byeWinner } : { player2_id: byeWinner };
    const { error } = await supabase.from("matches").update(patch).eq("id", m.next_match_id);
    if (error) throw error;
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
