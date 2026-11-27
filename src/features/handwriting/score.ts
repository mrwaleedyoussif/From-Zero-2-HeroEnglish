/**
 * Marking handwriting drawn on the screen against the model letters. Both are reduced to small
 * grids of filled cells; the mark says how much of the model was written and how much of the
 * learner's ink belongs to it. Practice feedback, measured from the shapes only.
 */
export interface Grid {
  w: number;
  h: number;
  cells: Uint8Array;
}
export interface Mark {
  score: number;
  /** Shape (how well the letters match), size and sitting on the line, each 0–100 or null. */
  shape: number;
  size: number | null;
  line: number | null;
  codes: MarkCode[];
}
export type MarkCode = "empty" | "missed" | "outside" | "small" | "big" | "offLine" | "good";

const count = (g: Grid) => g.cells.reduce((n, c) => n + c, 0);

/** Every cell within `r` cells of a filled one (a square neighbourhood, two passes). */
export function dilate(g: Grid, r: number): Grid {
  const pass = (src: Uint8Array, across: boolean) => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        if (!src[y * g.w + x]) continue;
        for (let d = -r; d <= r; d++) {
          const xx = across ? x + d : x;
          const yy = across ? y : y + d;
          if (xx >= 0 && xx < g.w && yy >= 0 && yy < g.h) out[yy * g.w + xx] = 1;
        }
      }
    return out;
  };
  return { ...g, cells: pass(pass(g.cells, true), false) };
}

/** Share of the model that was written, share of the ink on the model, and both together. */
export function overlap(model: Grid, ink: Grid, r: number) {
  const near = dilate(ink, r);
  const around = dilate(model, r);
  let covered = 0;
  let inside = 0;
  for (let i = 0; i < model.cells.length; i++) {
    if (model.cells[i] && near.cells[i]) covered++;
    if (ink.cells[i] && around.cells[i]) inside++;
  }
  const m = count(model);
  const k = count(ink);
  const coverage = m ? covered / m : 0;
  const precision = k ? inside / k : 0;
  const both = coverage + precision ? (2 * coverage * precision) / (coverage + precision) : 0;
  return { coverage, precision, both, model: m, ink: k };
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export function boxOf(g: Grid): Box | null {
  let x0 = g.w;
  let y0 = g.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++)
      if (g.cells[y * g.w + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** The part of a grid inside a box, stretched to w × h cells. */
export function fit(g: Grid, b: Box, w: number, h: number): Grid {
  const cells = new Uint8Array(w * h);
  const bw = b.x1 - b.x0 + 1;
  const bh = b.y1 - b.y0 + 1;
  for (let y = b.y0; y <= b.y1; y++)
    for (let x = b.x0; x <= b.x1; x++)
      if (g.cells[y * g.w + x]) {
        const xx = Math.min(w - 1, Math.floor(((x - b.x0) / bw) * w));
        const yy = Math.min(h - 1, Math.floor(((y - b.y0) / bh) * h));
        cells[yy * w + xx] = 1;
      }
  return { w, h, cells };
}

const codesOf = (o: ReturnType<typeof overlap>): MarkCode[] => [
  ...(o.coverage < 0.6 ? (["missed"] as const) : []),
  ...(o.precision < 0.6 ? (["outside"] as const) : []),
];

/** Tracing over the model: the ink should lie on the letters, and cover them. */
export function markTrace(model: Grid, ink: Grid, r: number): Mark {
  const o = overlap(model, ink, r);
  if (o.ink < Math.max(3, o.model * 0.05))
    return { score: 0, shape: 0, size: null, line: null, codes: ["empty"] };
  const shape = Math.round(o.both * 100);
  const codes = codesOf(o);
  return { score: shape, shape, size: null, line: null, codes: codes.length ? codes : ["good"] };
}

/**
 * Writing without the model underneath: the two shapes are compared after each is stretched to
 * the same frame (so a neat copy a little to the side still matches), then size and whether it
 * sits on the line are judged from where the ink is.
 */
export function markWrite(model: Grid, ink: Grid): Mark {
  const mb = boxOf(model);
  const ib = boxOf(ink);
  if (!mb || !ib || count(ink) < Math.max(3, count(model) * 0.05))
    return { score: 0, shape: 0, size: null, line: null, codes: ["empty"] };
  const H = 32;
  const W = Math.max(8, Math.min(480, Math.round(((mb.x1 - mb.x0 + 1) / (mb.y1 - mb.y0 + 1)) * H)));
  const o = overlap(fit(model, mb, W, H), fit(ink, ib, W, H), 3);
  const shape = Math.round(o.both * 100);
  const mh = mb.y1 - mb.y0 + 1;
  const ratio = (ib.y1 - ib.y0 + 1) / mh;
  const size = Math.round(100 * Math.max(0, 1 - Math.abs(Math.log2(ratio)) / 1.2));
  const line = Math.round(100 * Math.max(0, 1 - Math.abs(ib.y1 - mb.y1) / (mh * 0.6)));
  const codes: MarkCode[] = [
    ...codesOf(o),
    ...(ratio < 0.7 ? (["small"] as const) : ratio > 1.4 ? (["big"] as const) : []),
    ...(line < 60 ? (["offLine"] as const) : []),
  ];
  return {
    score: Math.round(shape * 0.6 + size * 0.2 + line * 0.2),
    shape,
    size,
    line,
    codes: codes.length ? codes : ["good"],
  };
}

/** Several lines of writing as one mark: lines with more to write count for more. */
export function combine(marks: { mark: Mark; weight: number }[]): Mark {
  const total = marks.reduce((n, m) => n + m.weight, 0) || 1;
  const mean = (pick: (m: Mark) => number | null) => {
    const have = marks.filter((m) => pick(m.mark) !== null);
    const w = have.reduce((n, m) => n + m.weight, 0);
    return w ? Math.round(have.reduce((n, m) => n + (pick(m.mark) ?? 0) * m.weight, 0) / w) : null;
  };
  const codes = [...new Set(marks.flatMap((m) => m.mark.codes))];
  const real = codes.filter((c) => c !== "good" && c !== "empty");
  return {
    score: Math.round(marks.reduce((n, m) => n + m.mark.score * m.weight, 0) / total),
    shape: mean((m) => m.shape) ?? 0,
    size: mean((m) => m.size),
    line: mean((m) => m.line),
    codes: marks.every((m) => m.mark.codes.includes("empty"))
      ? ["empty"]
      : real.length
        ? real
        : ["good"],
  };
}

export const starsOf = (score: number) => (score >= 85 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0);
