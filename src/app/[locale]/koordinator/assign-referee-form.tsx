"use client";

import { useRef, useState } from "react";
import { assignRefereeAction, searchDirectorsAction } from "./actions";

/** Dodela sudije turniru — pretraga igrača (predlozi) + slobodan tekst; opciono. */
export function AssignRefereeForm({
  turnirId,
  locale,
  currentName,
  labels,
}: {
  turnirId: string;
  locale: string;
  currentName: string | null;
  labels: { referee: string; assign: string; hint: string };
}) {
  const [name, setName] = useState(currentName ?? "");
  const [playerId, setPlayerId] = useState("");
  const [sugg, setSugg] = useState<{ id: string; name: string; klub: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onType(v: string) {
    setName(v);
    setPlayerId("");
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) { setSugg([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const res = await searchDirectorsAction(v);
      setSugg(res); setOpen(res.length > 0);
    }, 220);
  }

  return (
    <form action={assignRefereeAction} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="turnirId" value={turnirId} />
      <input type="hidden" name="playerId" value={playerId} />
      <span className="text-xs font-semibold text-muted">{labels.referee}:</span>
      <div className="relative">
        <input
          type="text"
          name="direktorIme"
          value={name}
          placeholder={labels.hint}
          autoComplete="off"
          onChange={(e) => onType(e.target.value)}
          onFocus={() => sugg.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-44 rounded-lg border border-line2 bg-bg px-2 py-1 text-xs outline-none focus:border-clay"
        />
        {open && (
          <ul className="absolute z-10 mt-1 max-h-48 w-56 overflow-auto rounded-lg border border-line bg-card shadow-lg">
            {sugg.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setName(s.name); setPlayerId(s.id); setOpen(false); }}
                  className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-bg2"
                >
                  <span className="font-medium text-navy">{s.name}</span>
                  {s.klub && <span className="truncate text-muted">{s.klub}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="submit"
        className="rounded-lg border border-line2 px-2.5 py-1 text-xs font-semibold text-slate transition hover:border-clay hover:text-clay"
      >
        {labels.assign}
      </button>
    </form>
  );
}
