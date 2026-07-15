import { getTranslations } from "next-intl/server";
import type { TournamentDraw, DrawMatchRow } from "@/lib/data/draws";
import { isRoundRobin, groupStandings } from "@/lib/draw-groups";

/**
 * Javni prikaz žreba jedne konkurencije:
 * - eliminacija: kolone po kolima (predkolo → finale), meč-kartice
 * - grupe: lista mečeva po grupi + eventualna eliminaciona završnica
 */

type Player = { id: string; ime: string; prezime: string } | null;

function playerLabel(p: Player, partner: Player) {
  if (!p) return null;
  const name = `${p.ime[0]}. ${p.prezime}`;
  return partner ? `${name} / ${partner.ime[0]}. ${partner.prezime}` : name;
}

function setScore(m: DrawMatchRow, slot: 1 | 2) {
  return m.match_sets
    .toSorted((a, b) => a.set_no - b.set_no)
    .map((s) => (slot === 1 ? s.gem1 : s.gem2))
    .join(" ");
}

function MatchRow({
  m,
  slot,
  byeLabel,
  tbdLabel,
}: {
  m: DrawMatchRow;
  slot: 1 | 2;
  byeLabel: string;
  tbdLabel: string;
}) {
  const player = slot === 1 ? m.p1 : m.p2;
  const partner = slot === 1 ? m.partner1 : m.partner2;
  const seed = slot === 1 ? m.seed1 : m.seed2;
  const isWinner = m.winner_slot === slot;
  const label = playerLabel(player, partner);
  const isBye = m.status === "bye" && !player;

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-1.5 text-sm ${
        isWinner ? "font-bold text-navy" : "text-slate"
      }`}
    >
      <span className="min-w-0 truncate">
        {seed ? <span className="mr-1 font-mono text-[0.7rem] text-clay">[{seed}]</span> : null}
        {label ?? (
          <span className="italic text-muted">{isBye ? byeLabel : tbdLabel}</span>
        )}
      </span>
      {m.match_sets.length > 0 && (
        <span className="shrink-0 font-mono text-xs">{setScore(m, slot)}</span>
      )}
      {isWinner && m.match_sets.length === 0 && <span className="shrink-0 text-xs">✓</span>}
    </div>
  );
}

function MatchCard({
  m,
  byeLabel,
  tbdLabel,
  statusLabel,
}: {
  m: DrawMatchRow;
  byeLabel: string;
  tbdLabel: string;
  statusLabel: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
      <MatchRow m={m} slot={1} byeLabel={byeLabel} tbdLabel={tbdLabel} />
      <div className="border-t border-line" />
      <MatchRow m={m} slot={2} byeLabel={byeLabel} tbdLabel={tbdLabel} />
      {statusLabel && (
        <div className="border-t border-dashed border-line bg-bg2 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-muted">
          {statusLabel}
        </div>
      )}
    </div>
  );
}

export async function DrawBracket({ draw }: { draw: TournamentDraw }) {
  const t = await getTranslations("draw");

  const byRound = new Map<number, DrawMatchRow[]>();
  for (const m of draw.matches) {
    const list = byRound.get(m.kolo) ?? [];
    list.push(m);
    byRound.set(m.kolo, list);
  }
  const groupMatches = draw.matches.filter((m) => m.kolo === 0 && m.grupa);
  const prelimMatches = draw.matches.filter((m) => m.kolo === 0 && !m.grupa);
  const allKoRounds = [...byRound.keys()].filter((k) => k > 0).sort((a, b) => a - b);
  // Kola koja su zapravo round-robin grupe (uvezena kao kolo>0) prikazujemo kao grupe.
  const rrRounds = allKoRounds.filter((k) => isRoundRobin(byRound.get(k) ?? []));
  const koRounds = allKoRounds.filter((k) => !rrRounds.includes(k));
  const lastRound = koRounds.at(-1) ?? 0;

  const roundName = (kolo: number) => {
    const fromEnd = lastRound - kolo;
    if (fromEnd === 0) return t("final");
    if (fromEnd === 1) return t("semifinal");
    if (fromEnd === 2) return t("quarterfinal");
    return t("round", { n: kolo });
  };

  const matchStatusLabel = (m: DrawMatchRow) =>
    ["walkover", "predaja", "retiranje", "u_toku"].includes(m.status)
      ? t(`status.${m.status}`)
      : null;

  // Blokovi grupa: prave grupe (m.grupa, natural sort) + kola detektovana kao RR.
  const groupBlocks: { key: string; title: string; matches: DrawMatchRow[] }[] = [
    ...[...new Set(groupMatches.map((m) => m.grupa!))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((g) => ({
        key: `g-${g}`,
        title: t("group", { g }),
        matches: groupMatches.filter((m) => m.grupa === g),
      })),
    ...rrRounds.map((k) => ({
      key: `rr-${k}`,
      title: t("groupRR"),
      matches: byRound.get(k) ?? [],
    })),
  ];

  return (
    <div className="space-y-5">
      {/* Grupe (round-robin): prave grupe (m.grupa) + kola koja su zapravo RR */}
      {groupBlocks.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {groupBlocks.map((blk) => {
            const table = groupStandings(blk.matches);
            return (
              <div key={blk.key}>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-court-dark">
                  {blk.title}
                </h4>
                {table.length > 0 && (
                  <ol className="mb-2 overflow-hidden rounded-xl border border-line bg-bg2 text-sm">
                    {table.map((r, i) => (
                      <li
                        key={r.name}
                        className="flex items-center justify-between gap-2 px-3 py-1 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-line"
                      >
                        <span className={i === 0 ? "font-bold text-navy" : "text-slate"}>
                          {i === 0 ? "🏆 " : `${i + 1}. `}
                          {r.name}
                        </span>
                        <span className="font-mono text-xs text-muted">
                          {t("winsShort", { n: r.wins })}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
                <div className="space-y-2">
                  {blk.matches.map((m) => (
                    <MatchCard
                      key={m.id}
                      m={m}
                      byeLabel={t("bye")}
                      tbdLabel={t("tbd")}
                      statusLabel={matchStatusLabel(m)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Eliminacija: kolone po kolima (horizontalni skrol na malim ekranima) */}
      {koRounds.length > 0 && (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {prelimMatches.length > 0 && (
              <div className="w-56 shrink-0">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-court-dark">
                  {t("prelim")}
                </h4>
                <div className="space-y-2">
                  {prelimMatches.map((m) => (
                    <MatchCard
                      key={m.id}
                      m={m}
                      byeLabel={t("bye")}
                      tbdLabel={t("tbd")}
                      statusLabel={matchStatusLabel(m)}
                    />
                  ))}
                </div>
              </div>
            )}
            {koRounds.map((kolo) => (
              <div key={kolo} className="flex w-56 shrink-0 flex-col">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-court-dark">
                  {roundName(kolo)}
                </h4>
                <div className="flex flex-1 flex-col justify-around gap-2">
                  {(byRound.get(kolo) ?? []).map((m) => (
                    <MatchCard
                      key={m.id}
                      m={m}
                      byeLabel={t("bye")}
                      tbdLabel={t("tbd")}
                      statusLabel={matchStatusLabel(m)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
