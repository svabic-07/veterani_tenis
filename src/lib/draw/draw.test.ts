import { describe, it, expect } from "vitest";
import {
  bracketSize,
  seedCount,
  generateKnockout,
  generateDraw,
  generateGrupa5,
  generateTwoGroups,
  computeGroupStandings,
  resolveGroupsIntoSemis,
  advanceWinner,
  type DrawEntry,
  type GeneratedDraw,
} from "./index";

/** Sintetički igrači: p1 najjači (1000 bodova), pa opadajuće; bez kluba osim ako se zada. */
function makeEntries(n: number, opts?: { unranked?: number; clubs?: Record<number, string> }): DrawEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    points: i < n - (opts?.unranked ?? 0) ? 1000 - i * 10 : null,
    clubId: opts?.clubs?.[i + 1] ?? null,
  }));
}

const firstRound = (d: GeneratedDraw) => d.matches.filter((m) => m.round === 1);
const lineOf = (d: GeneratedDraw, playerId: string) => {
  for (const m of firstRound(d)) {
    if (m.p1?.id === playerId) return m.position * 2 - 1;
    if (m.p2?.id === playerId) return m.position * 2;
  }
  return -1;
};

describe("bracketSize / seedCount", () => {
  it("kostur po TVS tabeli (do 10 → 8, 11–20 → 16, 21–40 → 32…)", () => {
    expect(bracketSize(8)).toBe(8);
    expect(bracketSize(10)).toBe(8);
    expect(bracketSize(11)).toBe(16);
    expect(bracketSize(20)).toBe(16);
    expect(bracketSize(21)).toBe(32);
    expect(bracketSize(40)).toBe(32);
    expect(bracketSize(41)).toBe(64);
    expect(bracketSize(81)).toBe(128);
  });

  it("broj nosilaca po TVS/ITF tabeli", () => {
    expect(seedCount(8, makeEntries(10))).toBe(2);
    expect(seedCount(16, makeEntries(12))).toBe(4);
    expect(seedCount(32, makeEntries(24))).toBe(8);
    expect(seedCount(64, makeEntries(50))).toBe(16);
  });

  it("nerangirani se ne nose", () => {
    expect(seedCount(16, makeEntries(12, { unranked: 9 }))).toBe(3);
  });
});

describe("generateKnockout — raspored nosilaca", () => {
  it("N1 na liniju 1, N2 na dno", () => {
    const d = generateKnockout(makeEntries(16), "seed-x");
    expect(lineOf(d, "p1")).toBe(1);
    expect(lineOf(d, "p2")).toBe(16);
  });

  it("N3–4 u različitim četvrtinama (anchor 5 i 12 za kostur 16)", () => {
    const d = generateKnockout(makeEntries(16), "seed-x");
    const lines = [lineOf(d, "p3"), lineOf(d, "p4")].sort((a, b) => a - b);
    expect(lines).toEqual([5, 12]);
  });

  it("N5–8 na anchor pozicijama za kostur 32", () => {
    const d = generateKnockout(makeEntries(32), "seed-y");
    const lines = [5, 6, 7, 8].map((s) => lineOf(d, `p${s}`)).sort((a, b) => a - b);
    expect(lines).toEqual([8, 16, 17, 25]);
  });

  it("svi učesnici raspoređeni, bez duplikata", () => {
    const d = generateKnockout(makeEntries(23), "seed-z");
    const ids = firstRound(d)
      .flatMap((m) => [m.p1?.id, m.p2?.id])
      .filter(Boolean);
    expect(ids.length).toBe(23);
    expect(new Set(ids).size).toBe(23);
  });
});

describe("generateKnockout — bye pravila", () => {
  it("bye ide nosiocima po opadajućem redu", () => {
    // 13 učesnika → kostur 16 → 3 bye-a → N1, N2, N3
    const d = generateKnockout(makeEntries(13), "seed-b");
    const byeMatches = firstRound(d).filter((m) => m.status === "bye");
    expect(byeMatches.length).toBe(3);
    const byeSeeds = byeMatches.map((m) => m.seed1 ?? m.seed2).sort();
    expect(byeSeeds).toEqual([1, 2, 3]);
  });

  it("nikad bye protiv bye", () => {
    // 9 učesnika → kostur 16 → 7 bye-ova (4 nosioca + 3 žrebom)
    const d = generateKnockout(makeEntries(9), "seed-c");
    for (const m of firstRound(d)) {
      expect(m.p1 !== null || m.p2 !== null).toBe(true);
    }
  });

  it("bye pobednik automatski napreduje u 2. kolo", () => {
    const d = generateKnockout(makeEntries(13), "seed-d");
    const bye = firstRound(d).find((m) => m.status === "bye" && (m.seed1 === 1 || m.seed2 === 1))!;
    const next = d.matches.find(
      (m) => m.round === bye.next!.round && m.position === bye.next!.position,
    )!;
    const advanced = bye.next!.slot === 1 ? next.p1 : next.p2;
    expect(advanced?.id).toBe("p1");
  });
});

describe("generateKnockout — determinizam i razdvajanje kluba", () => {
  it("isti rng seed → identičan žreb; drugi seed → (tipično) drugačiji", () => {
    const a = generateKnockout(makeEntries(16), "isti");
    const b = generateKnockout(makeEntries(16), "isti");
    const c = generateKnockout(makeEntries(16), "drugi");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it("N3 istog kluba kao N1 ide u drugu polovinu", () => {
    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
      const d = generateKnockout(
        makeEntries(16, { clubs: { 1: "klubX", 3: "klubX" } }),
        seed,
      );
      const half = (line: number) => (line <= 8 ? 0 : 1);
      expect(half(lineOf(d, "p3"))).not.toBe(half(lineOf(d, "p1")));
    }
  });

  it("izbegava klupske parove u 1. kolu kad je moguće", () => {
    const clubs: Record<number, string> = {};
    for (let i = 1; i <= 8; i++) clubs[i] = `k${i % 4}`; // 4 kluba × 2 igrača
    const d = generateKnockout(makeEntries(8, { clubs }), "club-sep");
    let sameClub = 0;
    for (const m of firstRound(d)) {
      if (m.p1?.clubId && m.p1.clubId === m.p2?.clubId) sameClub++;
    }
    expect(sameClub).toBe(0);
  });
});

describe("generateKnockout — predkolo (višak preko kostura)", () => {
  it("10 učesnika → kostur 8 + 2 meča predkola sa 4 najslabija", () => {
    const d = generateKnockout(makeEntries(10), "pre1");
    expect(d.kostur).toBe(8);
    const prelim = d.matches.filter((m) => m.round === 0);
    expect(prelim.length).toBe(2);
    const prelimIds = new Set(prelim.flatMap((m) => [m.p1!.id, m.p2!.id]));
    expect(prelimIds).toEqual(new Set(["p7", "p8", "p9", "p10"]));
    // svih 6 ostalih je u 1. kolu, 2 linije čekaju pobednike predkola
    const r1players = firstRound(d)
      .flatMap((m) => [m.p1, m.p2])
      .filter(Boolean);
    expect(r1players.length).toBe(6);
    // nema bye-ova kad ima predkola
    expect(firstRound(d).some((m) => m.status === "bye")).toBe(false);
  });

  it("pobednik predkola auto-napreduje na svoju liniju 1. kola", () => {
    let d = generateKnockout(makeEntries(9), "pre2");
    const prelim = d.matches.find((m) => m.round === 0)!;
    d = advanceWinner(d, 0, prelim.position, 1);
    const target = d.matches.find(
      (m) => m.round === prelim.next!.round && m.position === prelim.next!.position,
    )!;
    const filled = prelim.next!.slot === 1 ? target.p1 : target.p2;
    expect(filled?.id).toBe(prelim.p1!.id);
  });
});

describe("grupe", () => {
  it("3 učesnika → jedna grupa, 3 meča, bez nosilaca", () => {
    const d = generateDraw(makeEntries(3), "g3");
    expect(d.tip).toBe("grupa");
    expect(d.matches.length).toBe(3);
    expect(d.brojNosilaca).toBe(0);
  });

  it("4 učesnika → jedna grupa, 6 mečeva", () => {
    const d = generateDraw(makeEntries(4), "g4");
    expect(d.matches.filter((m) => m.round === 0).length).toBe(6);
  });

  it("grupa od 5: N1/N2 u PF, rang 3–4–5 u grupi (3 meča)", () => {
    const d = generateGrupa5(makeEntries(5), "g5");
    expect(d.tip).toBe("grupa5");
    const grupa = d.matches.filter((m) => m.round === 0);
    expect(grupa.length).toBe(3);
    const grupaIds = new Set(grupa.flatMap((m) => [m.p1!.id, m.p2!.id]));
    expect(grupaIds).toEqual(new Set(["p3", "p4", "p5"]));
    const sf = d.matches.filter((m) => m.round === 1);
    expect(sf[0].p1?.id).toBe("p1");
    expect(sf[1].p1?.id).toBe("p2");
  });

  it("6–7 učesnika → dve grupe, N1 u A, N2 u B, ukrštena PF", () => {
    const d = generateTwoGroups(makeEntries(7), "g7");
    const a = d.matches.filter((m) => m.group === "A");
    const b = d.matches.filter((m) => m.group === "B");
    expect(a.some((m) => m.p1?.id === "p1" || m.p2?.id === "p1")).toBe(true);
    expect(b.some((m) => m.p1?.id === "p2" || m.p2?.id === "p2")).toBe(true);
    // 7 → grupa A ima 4 (6 mečeva), B ima 3 (3 meča)
    expect(a.length).toBe(6);
    expect(b.length).toBe(3);
  });
});

describe("plasman u grupi i popuna polufinala", () => {
  it("plasman: pobede, pa međusobni skor kod 2 izjednačena", () => {
    let d = generateGrupa5(makeEntries(5), "st1");
    // p3 pobedi p4, p4 pobedi p5, p5 pobedi p3 → svi 1-1... zapravo krug:
    // koristimo setove za količnik: p3 ubedljivo, p5 tesno
    const g = d.matches.filter((m) => m.round === 0);
    const play = (pos: number, winnerSlot: 1 | 2, sets: { g1: number; g2: number }[]) => {
      const m = d.matches.find((x) => x.round === 0 && x.position === pos)!;
      d = advanceWinner(d, 0, m.position, winnerSlot, { sets });
    };
    // mečevi u grupi su svi parovi p3/p4/p5 (redosled zavisi od mešanja) —
    // odigraj tako da p4 ima 2 pobede, p3 1, p5 0
    for (const m of g) {
      const has = (id: string) => m.p1!.id === id || m.p2!.id === id;
      if (has("p4")) {
        play(m.position, m.p1!.id === "p4" ? 1 : 2, [{ g1: 6, g2: 3 }, { g1: 6, g2: 3 }]);
      } else {
        play(m.position, m.p1!.id === "p3" ? 1 : 2, [{ g1: 6, g2: 4 }, { g1: 6, g2: 4 }]);
      }
    }
    const st = computeGroupStandings(d.matches, "G");
    expect(st.map((s) => s.entry.id)).toEqual(["p4", "p3", "p5"]);

    const resolved = resolveGroupsIntoSemis(d);
    const sf1 = resolved.matches.find((m) => m.round === 1 && m.position === 1)!;
    const sf2 = resolved.matches.find((m) => m.round === 1 && m.position === 2)!;
    expect(sf1.p1?.id).toBe("p1"); // N1 vs 2. iz grupe
    expect(sf1.p2?.id).toBe("p3");
    expect(sf2.p1?.id).toBe("p2"); // N2 vs 1. iz grupe
    expect(sf2.p2?.id).toBe("p4");
  });

  it("ne popunjava PF dok grupa nije završena", () => {
    const d = generateGrupa5(makeEntries(5), "st2");
    const resolved = resolveGroupsIntoSemis(d);
    const sf1 = resolved.matches.find((m) => m.round === 1 && m.position === 1)!;
    expect(sf1.p2).toBeNull();
  });
});

describe("advanceWinner — auto-napredovanje", () => {
  it("pobednik ide u tačan slot sledećeg kola, do finala", () => {
    let d = generateKnockout(makeEntries(8), "adv");
    for (const m of d.matches.filter((x) => x.round === 1 && x.status !== "bye")) {
      d = advanceWinner(d, 1, m.position, 1);
    }
    const semis = d.matches.filter((m) => m.round === 2);
    for (const sf of semis) {
      expect(sf.p1).not.toBeNull();
      expect(sf.p2).not.toBeNull();
    }
    d = advanceWinner(d, 2, 1, 1);
    d = advanceWinner(d, 2, 2, 2);
    const finale = d.matches.find((m) => m.round === 3)!;
    expect(finale.p1).not.toBeNull();
    expect(finale.p2).not.toBeNull();
  });

  it("odbija dupli unos i nekompletan meč", () => {
    let d = generateKnockout(makeEntries(8), "adv2");
    const m = d.matches.find((x) => x.round === 1 && x.status !== "bye")!;
    d = advanceWinner(d, 1, m.position, 2);
    expect(() => advanceWinner(d, 1, m.position, 1)).toThrow("već rešen");
    expect(() => advanceWinner(d, 3, 1, 1)).toThrow("nema oba učesnika");
  });

  it("walkover se beleži kao status", () => {
    let d = generateKnockout(makeEntries(8), "adv3");
    const m = d.matches.find((x) => x.round === 1 && x.status !== "bye")!;
    d = advanceWinner(d, 1, m.position, 1, { status: "walkover" });
    expect(d.matches.find((x) => x.round === 1 && x.position === m.position)!.status).toBe(
      "walkover",
    );
  });
});

describe("parseSets — parsiranje unosa rezultata", () => {
  it("parsira uobičajene oblike", async () => {
    const { parseSets } = await import("./db");
    expect(parseSets("6:3 7:5")).toEqual([{ g1: 6, g2: 3 }, { g1: 7, g2: 5 }]);
    expect(parseSets("6-3, 7-6")).toEqual([{ g1: 6, g2: 3 }, { g1: 7, g2: 6 }]);
    expect(parseSets("9:8")).toEqual([{ g1: 9, g2: 8 }]);
    expect(parseSets("")).toEqual([]);
    expect(parseSets("nije rezultat")).toEqual([]);
  });
});

describe("generateDraw — izbor formata", () => {
  it("3–4 grupa · 5 grupa5 · 6–7 dve grupe · 8+ eliminacija", () => {
    expect(generateDraw(makeEntries(4), "f").tip).toBe("grupa");
    expect(generateDraw(makeEntries(5), "f").tip).toBe("grupa5");
    expect(generateDraw(makeEntries(6), "f").tip).toBe("grupa");
    expect(generateDraw(makeEntries(8), "f").tip).toBe("eliminacija");
    expect(generateDraw(makeEntries(40), "f").kostur).toBe(32);
  });

  it("odbija manje od 3 učesnika", () => {
    expect(() => generateDraw(makeEntries(2), "f")).toThrow();
  });
});
