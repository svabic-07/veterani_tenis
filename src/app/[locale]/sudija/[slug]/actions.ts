"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { belgradeInputToIso } from "@/lib/format";
import { buildTournamentReport } from "@/lib/tournament-report";
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

/** guard + odbij mutaciju ako je turnir završen — posle „ZAVRŠI TURNIR"
 *  nema izmena; ispravke idu kroz „Ponovo otvori turnir" (koordinator). */
async function guardOpen(formData: FormData, id: string) {
  const supabase = await guard(formData, id);
  const slug = String(formData.get("slug") ?? "");
  const { data: tr } = await supabase
    .from("tournaments")
    .select("status")
    .eq("legacy_id", slug)
    .maybeSingle();
  if (tr?.status === "zavrsen") throw new DrawError("tournament_finished");
  return supabase;
}

export async function createDrawAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const back = backTo(formData, `event-${eventId}`);
  try {
    const supabase = await guardOpen(formData, eventId);
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
    const supabase = await guardOpen(formData, drawId);
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
    const supabase = await guardOpen(formData, drawId);
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
    const supabase = await guardOpen(formData, eventId);
    await addEntry(supabase, eventId, playerId);
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=prijava");
}

/** Podešavanja turnira (RLS: staff write / direktor svoj turnir). */
export async function updateTournamentAction(formData: FormData) {
  const turnirId = String(formData.get("turnirId") ?? "");
  const back = backTo(formData, "podesavanja");
  try {
    if (!UUID_RE.test(turnirId)) throw new DrawError("bad_request");
    const supabase = await guardOpen(formData, turnirId);
    const naziv = String(formData.get("naziv") ?? "").trim().slice(0, 160);
    if (naziv.length < 3) throw new DrawError("bad_request");
    const s = (name: string, max: number) =>
      String(formData.get(name) ?? "").trim().slice(0, max) || null;
    const d = (name: string) => {
      const v = String(formData.get(name) ?? "").trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    };
    const rok = String(formData.get("rok") ?? "").trim();

    const { error } = await supabase
      .from("tournaments")
      .update({
        naziv,
        mesto: s("mesto", 80),
        domacin: s("domacin", 120),
        kontakt: s("kontakt", 80),
        lokacija: s("lokacija", 200),
        direktor_ime: s("direktorIme", 120),
        datum_od: d("datumOd"),
        datum_do: d("datumDo"),
        rok_prijave: rok ? belgradeInputToIso(rok) : null,
      })
      .eq("id", turnirId);
    if (error) throw new DrawError("forbidden");
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=podesavanja");
}

/** Gost na turniru: kreira igrača (i ne-člana) i odmah ga prijavljuje (status gost). */
export async function addGuestEntryAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const ime = String(formData.get("ime") ?? "").trim().slice(0, 60);
  const prezime = String(formData.get("prezime") ?? "").trim().slice(0, 60);
  const godisteRaw = String(formData.get("godiste") ?? "").trim();
  const godiste = /^\d{4}$/.test(godisteRaw) ? Number(godisteRaw) : null;
  const back = backTo(formData, `event-${eventId}`);
  try {
    if (ime.length < 2 || prezime.length < 2) throw new DrawError("bad_request");
    const supabase = await guardOpen(formData, eventId);
    // players: staff write RLS — gost po postojećem obrascu (legacy 'gost-…')
    const { data: player, error } = await supabase
      .from("players")
      .insert({ ime, prezime, godiste, legacy_id: `gost-${crypto.randomUUID().slice(0, 8)}` })
      .select("id")
      .single();
    if (error || !player) throw new DrawError("forbidden");
    try {
      await addEntry(supabase, eventId, player.id);
      const { error: stErr } = await supabase
        .from("entries")
        .update({ status: "gost" })
        .eq("event_id", eventId)
        .eq("player_id", player.id);
      if (stErr) throw new DrawError("forbidden");
    } catch (err) {
      // ne ostavljaj gosta-siroče: skloni prijavu (ako je nastala) pa igrača
      await supabase.from("entries").delete().eq("event_id", eventId).eq("player_id", player.id);
      await supabase.from("players").delete().eq("id", player.id);
      throw err;
    }
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=prijava");
}

/** Ručna oznaka nosioca na prijavi (pre žreba). Prazno = ukloni oznaku;
 *  bez ijedne ručne oznake nosioci se pri žrebu dodeljuju po bodovima. */
export async function setSeedAction(formData: FormData) {
  const entryId = String(formData.get("entryId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const seedRaw = String(formData.get("seed") ?? "").trim();
  const seed = /^\d{1,2}$/.test(seedRaw) ? Number(seedRaw) : null;
  const back = backTo(formData, `event-${eventId}`);
  try {
    if (!UUID_RE.test(entryId) || !UUID_RE.test(eventId)) throw new DrawError("bad_request");
    if (seedRaw !== "" && (seed === null || seed < 1 || seed > 32)) throw new DrawError("bad_request");
    const supabase = await guardOpen(formData, entryId);

    // žreb ne sme biti objavljen
    const { data: d } = await supabase
      .from("draws")
      .select("status")
      .eq("event_id", eventId)
      .maybeSingle();
    if (d && d.status !== "radna" && d.status !== "opozvan") throw new DrawError("draw_published");

    // isti broj ne sme biti dodeljen dvojici
    if (seed !== null) {
      const { data: taken } = await supabase
        .from("entries")
        .select("id")
        .eq("event_id", eventId)
        .eq("seed", seed)
        .neq("id", entryId)
        .limit(1);
      if (taken && taken.length > 0) throw new DrawError("seed_taken");
    }

    const { error } = await supabase.from("entries").update({ seed }).eq("id", entryId);
    if (error) throw new DrawError("forbidden");
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=nosilac");
}

/** Premesti prijavu u drugu konkurenciju (kategoriju) istog turnira.
 *  Delete + insert, da trigger ponovo popuni bodove za nošenje iz nove kategorije. */
export async function moveEntryAction(formData: FormData) {
  const entryId = String(formData.get("entryId") ?? "");
  const noviEventId = String(formData.get("noviEventId") ?? "");
  const back = backTo(formData, `event-${noviEventId}`);
  try {
    if (!UUID_RE.test(entryId) || !UUID_RE.test(noviEventId)) throw new DrawError("bad_request");
    const supabase = await guardOpen(formData, entryId);

    const { data: entry } = await supabase
      .from("entries")
      .select("id, player_id, event_id, status")
      .eq("id", entryId)
      .maybeSingle();
    if (!entry) throw new DrawError("bad_request");
    if (entry.event_id === noviEventId) throw new DrawError("bad_request");

    // obe konkurencije bez objavljenog žreba
    for (const evId of [entry.event_id, noviEventId]) {
      const { data: d } = await supabase
        .from("draws")
        .select("status")
        .eq("event_id", evId)
        .maybeSingle();
      if (d && d.status !== "radna" && d.status !== "opozvan") throw new DrawError("draw_published");
    }

    // prvo upiši novu prijavu, pa obriši staru — pad ne sme da izgubi prijavu
    const { data: nova, error: insErr } = await supabase
      .from("entries")
      .insert({ event_id: noviEventId, player_id: entry.player_id, status: entry.status })
      .select("id")
      .single();
    if (insErr || !nova) throw new DrawError(insErr?.code === "23505" ? "already_entered" : "forbidden");
    const { error: delErr } = await supabase.from("entries").delete().eq("id", entryId);
    if (delErr) {
      await supabase.from("entries").delete().eq("id", nova.id); // vrati na staro
      throw new DrawError("forbidden");
    }
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  back("ok=premestaj");
}

export async function removeEntryAction(formData: FormData) {
  const entryId = String(formData.get("entryId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const back = backTo(formData, `event-${eventId}`);
  try {
    const supabase = await guardOpen(formData, entryId);
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
    const supabase = await guardOpen(formData, matchId);
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
    const supabase = await guardOpen(formData, drawId);
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
    const supabase = await guardOpen(formData, tournamentId);
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
    const supabase = await guardOpen(formData, eventId);
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
  let vestOk = true;
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
        "missing_scoring_cell",
      ].find((k) => error.message.includes(k));
      throw new DrawError(known ?? "server");
    }

    // Automatski izveštaj u vestima (best-effort — ne sme srušiti završetak,
    // ali koordinator dobija upozorenje ako vest nije objavljena)
    try {
      const report = await buildTournamentReport(supabase, tournamentId);
      if (report) {
        const { error: newsErr } = await supabase.rpc("publish_news", {
          _naslov: report.naslov,
          _sadrzaj: report.sadrzaj,
          _turnir_id: tournamentId,
        });
        if (newsErr) vestOk = false;
        else revalidatePath("/vesti");
      }
    } catch {
      vestOk = false; // izveštaj je opciona pogodnost; završetak je već uspeo
    }
  } catch (err) {
    back(`greska=${errCode(err)}`);
    return;
  }
  revalidatePath("/rang-liste");
  back(vestOk ? "ok=zavrsen" : "ok=zavrsenBezVesti");
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
    const supabase = await guardOpen(formData, matchId);
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
