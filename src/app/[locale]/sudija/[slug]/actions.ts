"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createDrawForEvent,
  publishDraw,
  discardDraw,
  enterResult,
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
