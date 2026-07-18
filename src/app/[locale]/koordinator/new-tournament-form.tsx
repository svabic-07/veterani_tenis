"use client";

import { useRef, useState } from "react";
import { createTournamentAction, searchDirectorsAction } from "./actions";

type Club = { id: string; naziv: string; grad: string | null };
type Opt = { value: string; label: string };
type Labels = {
  name: string; series: string; system: string; club: string; director: string;
  directorHint: string; place: string; deadline: string; from: string; to: string; create: string;
};

const FIELD = "w-full rounded-xl border border-line2 bg-bg px-3 py-2.5 outline-none focus:border-clay";

export function NewTournamentForm({
  locale, clubs, seriesOptions, systemOptions, labels,
}: {
  locale: string;
  clubs: Club[];
  seriesOptions: Opt[];
  systemOptions: Opt[];
  labels: Labels;
}) {
  const [mesto, setMesto] = useState("");
  const [dirName, setDirName] = useState("");
  const [dirId, setDirId] = useState("");
  const [sugg, setSugg] = useState<{ id: string; name: string; klub: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onClub(id: string) {
    const c = clubs.find((x) => x.id === id);
    if (c?.grad) setMesto(c.grad); // autofill mesta iz grada kluba
  }

  function onDir(v: string) {
    setDirName(v);
    setDirId(""); // ručna izmena raskida vezu sa igračem (ostaje slobodan tekst)
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) { setSugg([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const res = await searchDirectorsAction(v);
      setSugg(res); setOpen(res.length > 0);
    }, 220);
  }

  return (
    <form action={createTournamentAction} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="direktorId" value={dirId} />

      <label className="text-sm sm:col-span-2">
        <span className="mb-1 block font-semibold text-navy">{labels.name}</span>
        <input type="text" name="naziv" required minLength={3} className={FIELD} />
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-semibold text-navy">{labels.series}</span>
        <select name="serija" defaultValue="s1000" className={FIELD}>
          {seriesOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-semibold text-navy">{labels.system}</span>
        <select name="sistem" defaultValue="kvalitativni" className={FIELD}>
          {systemOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-semibold text-navy">{labels.club}</span>
        <select name="klubId" defaultValue="" onChange={(e) => onClub(e.target.value)} className={FIELD}>
          <option value="">—</option>
          {clubs.map((c) => <option key={c.id} value={c.id}>{c.naziv}</option>)}
        </select>
      </label>

      {/* Direktor — slobodan tekst sa predlozima (opciono) */}
      <label className="relative text-sm">
        <span className="mb-1 block font-semibold text-navy">{labels.director}</span>
        <input
          type="text" name="direktorIme" value={dirName} placeholder={labels.directorHint}
          autoComplete="off"
          onChange={(e) => onDir(e.target.value)}
          onFocus={() => sugg.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={FIELD}
        />
        {open && (
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-card shadow-lg">
            {sugg.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setDirName(s.name); setDirId(s.id); setOpen(false); }}
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
        <span className="mb-1 block font-semibold text-navy">{labels.place}</span>
        <input type="text" name="mesto" value={mesto} onChange={(e) => setMesto(e.target.value)} className={FIELD} />
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-semibold text-navy">{labels.deadline}</span>
        <input type="datetime-local" name="rok" className={FIELD} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-navy">{labels.from}</span>
        <input type="date" name="datumOd" className={FIELD} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-navy">{labels.to}</span>
        <input type="date" name="datumDo" className={FIELD} />
      </label>

      <div className="sm:col-span-2">
        <button type="submit" className="rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-dark">
          {labels.create}
        </button>
      </div>
    </form>
  );
}
