"use client";

import { useRef, useState } from "react";
import { enterResultAction } from "./actions";

type Labels = { p1: string; p2: string; placeholder: string; save: string; statuses: Record<string, string> };

/**
 * Unos rezultata sa automatikom:
 * - strukturisan unos po setovima (dva boksa po setu),
 * - auto-fokus na sledeći boks,
 * - auto-dodavanje sledećeg seta dok nema pobednika (best-of-3),
 * - AUTO-detekcija pobednika iz setova (može se ručno pregaziti).
 * Šalje `rezultat` string ("6:3 7:5") — server action `enterResultAction` ostaje isti.
 */
export function ResultForm({
  m,
  eventId,
  slug,
  locale,
  labels,
}: {
  m: { id: string };
  eventId: string;
  slug: string;
  locale: string;
  labels: Labels;
}) {
  const [sets, setSets] = useState<{ a: string; b: string }[]>([{ a: "", b: "" }]);
  const [winnerOverride, setWinnerOverride] = useState<"" | "1" | "2">("");
  const [status, setStatus] = useState("zavrsen");
  const boxes = useRef<Record<string, HTMLInputElement | null>>({});

  const setsWon = (slot: 1 | 2) =>
    sets.filter((s) => {
      if (s.a === "" || s.b === "") return false;
      const a = +s.a, b = +s.b;
      if (a === b) return false;
      return slot === 1 ? a > b : b > a;
    }).length;
  const autoWinner: "" | "1" | "2" =
    setsWon(1) > setsWon(2) ? "1" : setsWon(2) > setsWon(1) ? "2" : "";
  const winner = winnerOverride || autoWinner;

  const rezultat = sets
    .filter((s) => s.a !== "" && s.b !== "")
    .map((s) => `${s.a}:${s.b}`)
    .join(" ");

  const noSets = status === "walkover";

  function update(i: number, side: "a" | "b", raw: string) {
    const v = raw.replace(/\D/g, "").slice(0, 2);
    const next = sets.map((s, idx) => (idx === i ? { ...s, [side]: v } : s));
    // auto-dodaj sledeći set kad je poslednji pun i još nema pobednika (max 3)
    const wa = next.filter((s) => s.a !== "" && s.b !== "" && +s.a > +s.b).length;
    const wb = next.filter((s) => s.a !== "" && s.b !== "" && +s.b > +s.a).length;
    const last = next[next.length - 1];
    if (last.a !== "" && last.b !== "" && next.length < 3 && wa < 2 && wb < 2) {
      next.push({ a: "", b: "" });
    }
    setSets(next);
    // auto-fokus: a → b istog seta; b → a sledećeg seta
    if (v !== "") {
      const target = side === "a" ? `${i}:b` : `${i + 1}:a`;
      requestAnimationFrame(() => boxes.current[target]?.focus());
    }
  }

  return (
    <form
      action={enterResultAction}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-line2 bg-bg2 p-3"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="matchId" value={m.id} />
      <input type="hidden" name="winner" value={winner} />
      <input type="hidden" name="rezultat" value={rezultat} />
      <input type="hidden" name="status" value={status} />

      {/* Pobednik — klik-dugmad, auto-obeležen iz setova */}
      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
        {([["1", labels.p1], ["2", labels.p2]] as const).map(([slot, name]) => {
          const isWin = winner === slot;
          const isAuto = autoWinner === slot && winnerOverride === "";
          return (
            <button
              type="button"
              key={slot}
              onClick={() => setWinnerOverride(winnerOverride === slot ? "" : slot)}
              className={`flex items-center gap-2 truncate rounded-lg border px-2 py-1 text-left text-sm transition ${
                isWin
                  ? "border-court bg-court/10 font-bold text-navy"
                  : "border-line2 text-slate hover:border-court"
              }`}
            >
              <span className="shrink-0">{isWin ? "🏆" : "○"}</span>
              <span className="truncate">{name}</span>
              {isAuto && <span className="ml-auto shrink-0 text-[0.65rem] text-muted">auto</span>}
            </button>
          );
        })}
      </div>

      {/* Setovi */}
      {!noSets && (
        <div className="flex items-center gap-1.5">
          {sets.map((s, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <input
                ref={(el) => { boxes.current[`${i}:a`] = el; }}
                inputMode="numeric"
                value={s.a}
                onChange={(e) => update(i, "a", e.target.value)}
                aria-label={`Set ${i + 1} · ${labels.p1}`}
                className="w-8 rounded-md border border-line2 bg-card px-1 py-1.5 text-center font-mono text-sm outline-none focus:border-clay"
                placeholder="–"
              />
              <span className="text-muted">:</span>
              <input
                ref={(el) => { boxes.current[`${i}:b`] = el; }}
                inputMode="numeric"
                value={s.b}
                onChange={(e) => update(i, "b", e.target.value)}
                aria-label={`Set ${i + 1} · ${labels.p2}`}
                className="w-8 rounded-md border border-line2 bg-card px-1 py-1.5 text-center font-mono text-sm outline-none focus:border-clay"
                placeholder="–"
              />
            </div>
          ))}
        </div>
      )}

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded-lg border border-line2 bg-card px-2 py-2 text-sm outline-none focus:border-clay"
      >
        {Object.entries(labels.statuses).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={winner === ""}
        className="rounded-lg bg-court px-4 py-2 text-sm font-semibold text-white transition hover:bg-court-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        {labels.save}
      </button>
    </form>
  );
}
