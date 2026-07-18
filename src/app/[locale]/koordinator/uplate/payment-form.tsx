"use client";

import { useRef, useState } from "react";
import { addPaymentAction, searchDirectorsAction } from "../actions";

type Labels = {
  player: string; hint: string; type: string; clanarina: string; kotizacija: string;
  amount: string; season: string; note: string; add: string;
};

/** Nova uplata: pretraživ izbor igrača + tip + iznos + sezona. */
export function PaymentForm({ locale, labels }: { locale: string; labels: Labels }) {
  const [text, setText] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [sugg, setSugg] = useState<{ id: string; name: string; klub: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const year = new Date().getFullYear();

  return (
    <form action={addPaymentAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="playerId" value={playerId} />
      <label className="relative text-sm sm:col-span-2">
        <span className="mb-1 block font-semibold text-navy">{labels.player}</span>
        <input
          type="text" value={text} placeholder={labels.hint} autoComplete="off"
          onChange={(e) => {
            const v = e.target.value;
            setText(v); setPlayerId("");
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
                  onMouseDown={(e) => { e.preventDefault(); setText(s.name); setPlayerId(s.id); setOpen(false); }}
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
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-navy">{labels.type}</span>
        <select name="tip" defaultValue="clanarina" className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay">
          <option value="clanarina">{labels.clanarina}</option>
          <option value="kotizacija">{labels.kotizacija}</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-navy">{labels.amount}</span>
        <input type="text" name="iznos" required inputMode="decimal" placeholder="3000" className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-navy">{labels.season}</span>
        <input type="text" name="sezona" inputMode="numeric" defaultValue={year} className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-navy">{labels.note}</span>
        <input type="text" name="napomena" className="w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay" />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={!playerId}
          className="rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {labels.add}
        </button>
      </div>
    </form>
  );
}
