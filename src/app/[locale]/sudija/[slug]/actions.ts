"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { belgradeInputToIso } from "@/lib/format";
import {
  createDrawForEvent,
  publishDraw,
  discardDraw,
  enterResult,
  addEntry,
  removeEntry,
  scheduleMatch,
  swapSlots,
  parseSets,
  DrawError,
} from "@/lib/draw/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function backTo(formData: FormData, param: string) {
  const locale = String(formData.get("locale") ?? "sr");
  const slug = String(formData.get("slug") ?? "");
  return (query: string) => {
    revalidatePath(`/sudija/${slug}`);
    revalidatePath(`/turnir/${slug}`);
    redirect({ href: `/sudija/${slug}?${query}${param ? `#${param}` : ""}`, locale });
  };
}

async function guard(formData: FormData, id: string) {
  if (!UUID_RE.test(id)) throw new DrawError("bad_request");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new DrawError("auth_required");
  return supabase;
}

function errCode(err: unknown): string {
  return err instanceof DrawError ? err.code : "server";
}

export async function createDrawAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const back = backTo(formData, `event-${eventId}`);
  try {
    const supabase = await guard(formData, eventId);
    await createDrawForEvent(supabase, eventId);
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=kreiran");
}

export async function publishDrawAction(formData: FormData) {
  const drawId = String(formData.get("drawId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const back = backTo(formData, `event-${eventId}`);
  try {
    const supabase = await guard(formData, drawId);
    await publishDraw(supabase, drawId);
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=objavljen");
}

export async function discardDrawAction(formData: FormData) {
  const drawId = String(formData.get("drawId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const back = backTo(formData, `event-${eventId}`);
  try {
    const supabase = await guard(formData, drawId);
    await discardDraw(supabase, drawId);
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=ponisten");
}

export async function addEntryAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const back = backTo(formData, `event-${eventId}`);
  try {
    if (!UUID_RE.test(playerId)) throw new DrawError("bad_request");
    const supabase = await guard(formData, eventId);
    await addEntry(supabase, eventId, playerId);
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=prijava");
}

export async function removeEntryAction(formData: FormData) {
  const entryId = String(formData.get("entryId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const back = backTo(formData, `event-${eventId}`);
  try {
    const supabase = await guard(formData, entryId);
    await removeEntry(supabase, entryId);
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=odjava");
}

export async function scheduleMatchAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const termin = String(formData.get("termin") ?? "").trim();
  const teren = String(formData.get("teren") ?? "").trim();
  const back = backTo(formData, `event-${eventId}`);
  try {
    const supabase = await guard(formData, matchId);
    await scheduleMatch(supabase, matchId, termin ? belgradeInputToIso(termin) : null, teren || null);
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=satnica");
}

export async function swapSlotsAction(formData: FormData) {
  const drawId = String(formData.get("drawId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const slotA = String(formData.get("slotA") ?? "");
  const slotB = String(formData.get("slotB") ?? "");
  const back = backTo(formData, `event-${eventId}`);
  try {
    const parse = (s: string) => {
      const [matchId, slot] = s.split("|");
      if (!UUID_RE.test(matchId) || (slot !== "1" && slot !== "2")) {
        throw new DrawError("bad_request");
      }
      return { matchId, slot: Number(slot) as 1 | 2 };
    };
    const supabase = await guard(formData, drawId);
    await swapSlots(supabase, drawId, parse(slotA), parse(slotB));
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=zamena");
}

/** Koordinator: opoziv objavljenog žreba (audit u bazi). */
export async function revokeDrawAction(formData: FormData) {
  const drawId = String(formData.get("drawId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const back = backTo(formData, `event-${eventId}`);
  try {
    const supabase = await guard(formData, drawId);
    const { error } = await supabase.rpc("revoke_draw", { _draw_id: drawId });
    if (error) throw new DrawError(pickKnown(error.message));
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=opozvan");
}

/** Koordinator: poništavanje unetog rezultata (audit u bazi). */
export async function clearResultAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const back = backTo(formData, `event-${eventId}`);
  try {
    const supabase = await guard(formData, matchId);
    const { error } = await supabase.rpc("clear_match_result", { _match_id: matchId });
    if (error) throw new DrawError(pickKnown(error.message));
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=rezultat_ponisten");
}

/** Koordinator: ponovno otvaranje završenog turnira (briše bodove + rang). */
export async function reopenTournamentAction(formData: FormData) {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const back = backTo(formData, "");
  try {
    if (formData.get("potvrda") !== "on") throw new DrawError("confirm_required");
    const supabase = await guard(formData, tournamentId);
    const { error } = await supabase.rpc("reopen_tournament", { _tournament_id: tournamentId });
    if (error) throw new DrawError(pickKnown(error.message));
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  revalidatePath("/rang-liste");
  back("ok=otvoren");
}

/** Nova konkurencija (kategorija × disciplina). */
export async function addEventAction(formData: FormData) {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const kategorija = String(formData.get("kategorija") ?? "").trim();
  const disciplina = String(formData.get("disciplina") ?? "");
  const back = backTo(formData, "");
  try {
    if (!kategorija || kategorija.length > 8) throw new DrawError("bad_request");
    if (!["singl", "dubl", "miks"].includes(disciplina)) throw new DrawError("bad_request");
    const supabase = await guard(formData, tournamentId);
    const { error } = await supabase.from("tournament_events").insert({
      turnir_id: tournamentId,
      kategorija,
      disciplina: disciplina as "singl" | "dubl" | "miks",
    });
    if (error) throw new DrawError(error.code === "23505" ? "event_exists" : "server");
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=konkurencija");
}

/** Brisanje konkurencije (samo bez žreba; prijave se brišu kaskadno). */
export async function removeEventAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const back = backTo(formData, "");
  try {
    const supabase = await guard(formData, eventId);
    const { data: draw } = await supabase
      .from("draws")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();
    if (draw) throw new DrawError("draw_published");
    const { error } = await supabase.from("tournament_events").delete().eq("id", eventId);
    if (error) throw error;
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=konkurencija_obrisana");
}

function pickKnown(message: string): string {
  return (
    [
      "forbidden",
      "not_published",
      "draw_not_found",
      "tournament_finished",
      "match_not_found",
      "match_unresolved",
      "bye_match",
      "downstream_resolved",
      "not_finished",
    ].find((k) => message.includes(k)) ?? "server"
  );
}

export async function finishTournamentAction(formData: FormData) {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const back = backTo(formData, "");
  try {
    if (formData.get("potvrda") !== "on") throw new DrawError("confirm_required");
    const supabase = await guard(formData, tournamentId);
    const { error } = await supabase.rpc("finish_tournament", {
      _tournament_id: tournamentId,
    });
    if (error) {
      // poruke iz SQL funkcije (forbidden, unresolved_matches, ...)
      const known = [
        "forbidden",
        "already_finished",
        "working_draw_exists",
        "unresolved_matches",
        "no_published_draws",
        "tournament_not_found",
      ].find((k) => error.message.includes(k));
      throw new DrawError(known ?? "server");
    }
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  revalidatePath("/rang-liste");
  back("ok=zavrsen");
}

export async function enterResultAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const winner = Number(formData.get("winner"));
  const status = String(formData.get("status") ?? "zavrsen");
  const rezultat = String(formData.get("rezultat") ?? "");
  const back = backTo(formData, `event-${eventId}`);

  try {
    if (winner !== 1 && winner !== 2) throw new DrawError("winner_required");
    if (!["zavrsen", "walkover", "predaja", "retiranje"].includes(status)) {
      throw new DrawError("bad_request");
    }
    const supabase = await guard(formData, matchId);
    await enterResult(supabase, matchId, {
      winnerSlot: winner,
      status: status as "zavrsen" | "walkover" | "predaja" | "retiranje",
      sets: parseSets(rezultat),
    });
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=rezultat");
}
