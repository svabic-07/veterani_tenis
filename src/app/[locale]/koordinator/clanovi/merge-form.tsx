"use client";

import { useRef, useState } from "react";
import { mergePlayersAction, searchDirectorsAction } from "../actions";

type Pick = { id: string; name: string } | null;
type Labels = { keep: string; dup: string; hint: string; merge: string; confirm: string };

function PlayerPick({
  label, hint, onPick,
}: { label: string; hint: string; onPick: (p: Pick) => void }) {
  const [text, setText] = useState("");
  const [sugg, setSugg] = useState<{ id: string; name: string; klub: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <label className="relative min-w-0 flex-1 basis-52 text-sm">
      <span className="mb-1 block font-semibold text-navy">{label}</span>
      <input
        type="text" value={text} placeholder={hint} autoComplete="off"
        onChange={(e) => {
          const v = e.target.value;
          setText(v); onPick(null);
          if (timer.current) clearTimeout(timer.current);
          if (v.trim().length < 2) { setSugg([]); setOpen(false); return; }
          timer.current = setTimeout(async () => {
            const res = await searchDirectorsAction(v);
            setSugg(res); setOpen(res.length > 0);
          }, 220);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay"
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-line bg-card shadow-lg">
          {sugg.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setText(s.name); onPick({ id: s.id, name: s.name }); setOpen(false); }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-bg2"
              >
                <span className="font-medium text-navy">{s.name}</span>
                {s.klub && <span className="truncate text-xs text-muted">{s.klub}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}

/** Spajanje duplikata: izaberi „zadrži" i „duplikat" pa spoji (uz potvrdu). */
export function MergeForm({ locale, labels }: { locale: string; labels: Labels }) {
  const [keep, setKeep] = useState<Pick>(null);
  const [dup, setDup] = useState<Pick>(null);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <form action={mergePlayersAction} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="keepId" value={keep?.id ?? ""} />
      <input type="hidden" name="dupId" value={dup?.id ?? ""} />
      <div className="flex flex-wrap gap-3">
        <PlayerPick label={labels.keep} hint={labels.hint} onPick={setKeep} />
        <PlayerPick label={labels.dup} hint={labels.hint} onPick={setDup} />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="accent-clay" />
        {labels.confirm}
      </label>
      <button
        type="submit"
        disabled={!keep || !dup || keep.id === dup.id || !confirmed}
        className="rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        {labels.merge}
      </button>
    </form>
  );
}
