import { describe, expect, it } from "vitest";
import { rowStrokes, type Pt, wrap, fontOf } from "./geometry";
import { grade } from "./grade";
import { place } from "./place";

const shift = (ink: Pt[][], dx: number, dy: number): Pt[][] =>
  ink.map((s) => s.map((p): Pt => [p[0] + dx, p[1] + dy]));
const scale = (ink: Pt[][], k: number, cx: number, cy: number): Pt[][] =>
  ink.map((s) => s.map((p): Pt => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]));

describe.each(["cursive", "print"] as const)("%s handwriting", (style) => {
  const P = place(style, "cat", 600);

  it("has pen strokes for every letter, mark and digit, in a sensible number", () => {
    for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!'")
      expect(rowStrokes(style, ch).length, ch).toBeGreaterThan(0);
    // Joined writing lifts the pen less than print.
    expect(rowStrokes("cursive", "minimum").length).toBeLessThan(
      rowStrokes("print", "minimum").length,
    );
  });

  it("tracing exactly on the model is a top mark", () => {
    const g = grade(P, P.strokes, "trace");
    expect(g.score).toBeGreaterThanOrEqual(95);
    expect(g.codes).toEqual(["good"]);
  });

  it("nothing written is not marked", () => {
    expect(grade(P, [], "trace").codes).toEqual(["empty"]);
    expect(grade(P, [[[5, 5]]], "write").score).toBe(0);
  });

  it("half the word is told which part is missing", () => {
    const g = grade(
      P,
      P.strokes.slice(0, 1).map((s) => s.slice(0, Math.floor(s.length / 3))),
      "trace",
    );
    expect(g.codes).toContain("missed");
    expect(g.score).toBeLessThan(40);
  });

  it("tracing the wrong way round is told about direction", () => {
    const back = P.strokes.map((s) => s.slice().reverse()).reverse();
    const g = grade(P, back, "trace");
    expect(g.codes).toContain("direction");
    expect(g.score).toBeLessThan(grade(P, P.strokes, "trace").score);
  });

  it("a line beside the letters is off the path", () => {
    const g = grade(P, shift(P.strokes, 0, P.xh * 1.5), "trace");
    expect(g.codes).toContain("offPath");
    expect(g.score).toBeLessThan(30);
  });

  it("writing it alone: the right shape scores high wherever it starts", () => {
    const g = grade(P, shift(P.strokes, 12, 4), "write");
    expect(g.score).toBeGreaterThanOrEqual(80);
  });

  it("writing it alone: too small and a scribble are both told", () => {
    const small = scale(P.strokes, 0.4, P.box.x0, P.rows[0]!.base);
    expect(grade(P, small, "write").codes).toContain("small");
    expect(grade(P, shift(P.strokes, 0, P.xh * 2), "write").codes).toContain("offLine");
    const zig: Pt[] = Array.from({ length: 80 }, (_, i) => [
      P.box.x0 + ((P.box.x1 - P.box.x0) * i) / 79,
      i % 2 ? P.box.y0 : P.box.y1,
    ]);
    const g = grade(P, [zig], "write");
    expect(g.codes).toContain("shape");
    expect(g.score).toBeLessThan(60);
  });

  it("a paragraph wraps into rows that fit the page", () => {
    const text = "I want to write well. I hold my pen gently and sit up straight.";
    const long = place(style, text, 360);
    expect(long.rows.length).toBeGreaterThan(2);
    expect(long.box.x1).toBeLessThanOrEqual(360);
    expect(long.xh).toBeGreaterThanOrEqual(19);
    expect(wrap(fontOf(style), text, 4000).join(" ")).toBe(text);
    expect(grade(long, long.strokes, "trace").score).toBeGreaterThanOrEqual(95);
  });
});
