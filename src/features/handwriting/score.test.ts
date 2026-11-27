import { describe, expect, it } from "vitest";
import { combine, type Grid, markTrace, markWrite, starsOf } from "./score";

const grid = (w: number, h: number, on: (x: number, y: number) => boolean): Grid => {
  const cells = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) cells[y * w + x] = 1;
  return { w, h, cells };
};
// A capital L: a stem and a foot.
const L = (dx = 0, dy = 0, s = 1) =>
  grid(60, 60, (x, y) => {
    const u = (x - dx) / s;
    const v = (y - dy) / s;
    return (u >= 10 && u < 13 && v >= 10 && v < 40) || (v >= 37 && v < 40 && u >= 10 && u < 30);
  });

describe("marking handwriting", () => {
  it("gives a traced letter a high mark and an empty page none", () => {
    expect(markTrace(L(), L(1, 0), 2).score).toBeGreaterThan(90);
    expect(
      markTrace(
        L(),
        grid(60, 60, () => false),
        2,
      ).codes,
    ).toEqual(["empty"]);
  });

  it("says what was missed and what went outside the letters", () => {
    const half = grid(60, 60, (x, y) => x >= 10 && x < 13 && y >= 10 && y < 25);
    expect(markTrace(L(), half, 2).codes).toContain("missed");
    const scribble = grid(60, 60, (x, y) => y >= 45 && y < 55 && x > 30);
    const m = markTrace(L(), scribble, 2);
    expect(m.codes).toEqual(expect.arrayContaining(["missed", "outside"]));
    expect(m.score).toBeLessThan(20);
  });

  it("marks free writing by shape, size and the line", () => {
    const good = markWrite(L(), L(3, 0));
    expect(good.score).toBeGreaterThan(85);
    expect(good.codes).toEqual(["good"]);
    const tiny = markWrite(L(), L(8, 18, 0.5));
    expect(tiny.codes).toContain("small");
    expect(tiny.shape).toBeGreaterThan(60);
    const high = markWrite(L(), L(0, -9));
    expect(high.codes).toContain("offLine");
    const other = markWrite(
      L(),
      grid(60, 60, (x, y) => Math.abs(x - y) < 2 && x > 10 && x < 40),
    );
    expect(other.shape).toBeLessThan(good.shape - 25);
  });

  it("joins the lines of a paragraph into one mark, and gives stars", () => {
    const a = markTrace(L(), L(), 2);
    const none = markTrace(
      L(),
      grid(60, 60, () => false),
      2,
    );
    const c = combine([
      { mark: a, weight: 3 },
      { mark: none, weight: 1 },
    ]);
    expect(c.score).toBe(75);
    expect(c.codes).toEqual(["good"]);
    expect([starsOf(90), starsOf(72), starsOf(55), starsOf(10)]).toEqual([3, 2, 1, 0]);
  });
});
