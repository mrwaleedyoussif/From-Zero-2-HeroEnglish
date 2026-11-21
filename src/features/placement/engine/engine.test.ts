import { describe, expect, it } from "vitest";
import { step } from "./cat.ts";
import { eap, GRID } from "./eap.ts";
import { bFromDifficulty, information, itemB, probability } from "./rasch.ts";
import { mulberry32, normal, stepRng } from "./rng.ts";
import { chooseSkill, selectItem } from "./select.ts";
import { stopReason } from "./stopping.ts";
import type { Blueprint, EngineAnswer, EngineItem } from "./types.ts";

const ans = (
  skill: string,
  b: number,
  correct: boolean,
  id = `${skill}-${b}-${Math.random()}`,
): EngineAnswer => ({
  itemId: id,
  skill,
  b,
  correct,
});
const BP: Blueprint = {
  minItems: 3,
  maxItems: 10,
  targetSe: 0.5,
  timeLimitSec: 600,
  skillMinShares: { A: 0.5, B: 0.25 },
};

describe("rng", () => {
  it("is deterministic per seed and step", () => {
    expect(mulberry32(1)()).toBe(mulberry32(1)());
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
    expect(stepRng(99, 3)()).toBe(stepRng(99, 3)());
    expect(stepRng(99, 3)()).not.toBe(stepRng(99, 4)());
  });
  it("gives uniform values in [0,1) and a standard normal", () => {
    const r = mulberry32(5);
    const xs = Array.from({ length: 4000 }, () => normal(r));
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length);
    expect(Math.abs(mean)).toBeLessThan(0.06);
    expect(Math.abs(sd - 1)).toBeLessThan(0.06);
    expect(normal(() => 0, 1, 2)).toBeGreaterThan(5); // guarded log(0)
  });
});

describe("Rasch model", () => {
  it("has P = 0.5 at θ = b and maximal information there", () => {
    expect(probability(1, 1)).toBe(0.5);
    expect(information(0, 0)).toBe(0.25);
    expect(information(0, 2)).toBeLessThan(0.25);
    expect(probability(2, 0)).toBeGreaterThan(0.88);
  });
  it("maps difficulty 1–10 to −2.7 … +2.7 and prefers calibrated b", () => {
    expect(bFromDifficulty(1)).toBe(-2.7);
    expect(bFromDifficulty(10)).toBe(2.7);
    expect(itemB({ difficulty: 3, b_calibrated: null })).toBe(-1.5);
    expect(itemB({ difficulty: 3, b_calibrated: 0.42 })).toBe(0.42);
  });
});

describe("EAP", () => {
  it("returns the prior with no answers", () => {
    const e = eap([], { mean: 0.5, sd: 1 });
    expect(e.theta).toBeCloseTo(0.5, 2);
    expect(e.se).toBeCloseTo(1, 1);
    expect(GRID).toHaveLength(161);
  });
  it("moves up after right answers, down after wrong ones, and narrows", () => {
    const up = eap([ans("A", 0, true), ans("A", 0.5, true)], { mean: 0, sd: 1 });
    const down = eap([ans("A", 0, false), ans("A", -0.5, false)], { mean: 0, sd: 1 });
    expect(up.theta).toBeGreaterThan(0.3);
    expect(down.theta).toBeLessThan(-0.3);
    expect(up.se).toBeLessThan(1);
  });
  it("stays finite on very long tests", () => {
    const many = Array.from({ length: 400 }, (_, i) => ans("A", (i % 7) - 3, i % 3 !== 0));
    const e = eap(many, { mean: 0, sd: 1 });
    expect(Number.isFinite(e.theta)).toBe(true);
    expect(e.se).toBeLessThan(0.15);
  });
});

describe("item selection", () => {
  it("balances skills by deficit and returns null once minimums are met", () => {
    const avail = new Set(["A", "B", "C"]);
    expect(chooseSkill({ A: 0.5, B: 0.25 }, [], avail)).toBe("A");
    expect(chooseSkill({ A: 0.5, B: 0.25 }, [ans("A", 0, true), ans("A", 0, true)], avail)).toBe(
      "B",
    );
    expect(chooseSkill({ A: 0.5 }, [ans("A", 0, true)], avail)).toBeNull();
    expect(chooseSkill({ Z: 1 }, [], avail)).toBeNull();
  });
  it("picks among the 5 closest items in the needed skill", () => {
    const pool: [EngineItem, ...EngineItem[]] = [
      { id: "a1", skill: "A", b: 2 },
      ...Array.from({ length: 8 }, (_, i) => ({ id: `b${i}`, skill: "B", b: i * 0.5 - 2 })),
    ];
    const picks = new Set<string>();
    const r = mulberry32(3);
    for (let i = 0; i < 200; i++) picks.add(selectItem(pool, 0, [], { B: 1 }, r).id);
    expect([...picks].sort()).toEqual(["b2", "b3", "b4", "b5", "b6"]); // b ∈ {−1 … 1}
    expect(selectItem(pool, 2, [], {}, () => 0).id).toBe("a1"); // no quota → closest overall
  });
});

describe("stopping rule", () => {
  it("stops for time, item cap and precision, in that order", () => {
    expect(stopReason({ answered: 1, se: 0.9, elapsedSec: 600 }, BP)).toBe("time");
    expect(stopReason({ answered: 10, se: 0.9, elapsedSec: 0 }, BP)).toBe("maxItems");
    expect(stopReason({ answered: 3, se: 0.4, elapsedSec: 0 }, BP)).toBe("precision");
    expect(stopReason({ answered: 2, se: 0.4, elapsedSec: 0 }, BP)).toBeNull();
    expect(
      stopReason({ answered: 3, se: 0.6, elapsedSec: 999 }, { ...BP, timeLimitSec: null }),
    ).toBeNull();
  });
});

describe("adaptive step", () => {
  const pool: EngineItem[] = [
    { id: "x1", skill: "A", b: -1 },
    { id: "x2", skill: "A", b: 1 },
    { id: "x3", skill: "B", b: 0 },
  ];
  it("serves an item, then reports exhaustion when the pool runs out", () => {
    const first = step({
      answers: [],
      pool,
      blueprint: BP,
      prior: { mean: 0, sd: 1 },
      rng: () => 0,
      elapsedSec: 0,
    });
    expect(first.stop).toBeNull();
    expect(first.next?.skill).toBe("A");
    const all = pool.map((i) => ans(i.skill, i.b, true, i.id));
    const done = step({
      answers: all,
      pool,
      blueprint: { ...BP, minItems: 5 },
      prior: { mean: 0, sd: 1 },
      rng: () => 0,
      elapsedSec: 0,
    });
    expect(done).toMatchObject({ stop: "exhausted", next: null });
  });
  it("stops with the reason from the stopping rule", () => {
    const r = step({
      answers: [],
      pool,
      blueprint: BP,
      prior: { mean: 0, sd: 1 },
      rng: () => 0,
      elapsedSec: 601,
    });
    expect(r).toMatchObject({ stop: "time", next: null });
  });
});
