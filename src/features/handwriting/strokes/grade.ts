import { type Pt, resample } from "./geometry";
import type { ModelPt, Placed } from "./place";

export type Mode = "trace" | "write";
export type TipCode =
  "empty" | "missed" | "offPath" | "shape" | "direction" | "small" | "big" | "offLine" | "good";
export type Grade = {
  score: number;
  /** How much of the model was written. */
  coverage: number;
  /** Tracing: how much of the ink stays on the model. Writing: how well the shape matches. */
  match: number;
  /** How much of the ink moves the same way as the model. */
  direction: number;
  covered: Uint8Array;
  /** The learner's ink, point by point, and whether each point is on the model. */
  ink: Pt[];
  on: Uint8Array;
  empty: boolean;
  size?: number;
  sizeOk?: boolean;
  lineOk?: boolean;
  codes: TipCode[];
};

export const PASS = 60;
export const starsOf = (score: number) =>
  score >= 80 ? 3 : score >= PASS ? 2 : score >= 40 ? 1 : 0;

function measure(model: ModelPt[], ink: Pt[][], tol: number) {
  const pts: ModelPt[] = [];
  ink.forEach((st, k) =>
    (st.length > 1 ? resample(st, 3) : st).forEach((p) => pts.push([p[0], p[1], k])),
  );
  const n = model.length;
  const covered = new Uint8Array(n);
  const on = new Uint8Array(pts.length);
  const t2 = tol * tol;
  let fwd = 0;
  let back = 0;
  let prev = -1;
  let prevStroke = -1;
  let onCount = 0;
  pts.forEach((p, i) => {
    if (p[2] !== prevStroke) {
      prev = -1;
      prevStroke = p[2];
    }
    let bestJ = -1;
    let bestD = Infinity;
    let nearJ = -1;
    let nearGap = Infinity;
    for (let j = 0; j < n; j++) {
      const dx = model[j]![0] - p[0];
      const dy = model[j]![1] - p[1];
      const d = dx * dx + dy * dy;
      if (d <= t2) {
        covered[j] = 1;
        const g = Math.abs(j - prev - 1);
        if (prev >= 0 && g < nearGap) {
          nearGap = g;
          nearJ = j;
        }
      }
      if (d < bestD) {
        bestD = d;
        bestJ = j;
      }
    }
    if (bestD > t2) return;
    on[i] = 1;
    onCount++;
    const j = prev >= 0 && nearJ >= 0 ? nearJ : bestJ;
    if (prev >= 0 && j !== prev) {
      if (j > prev) fwd++;
      else back++;
    }
    prev = j;
  });
  let cov = 0;
  for (let j = 0; j < n; j++) cov += covered[j]!;
  return {
    coverage: n ? cov / n : 0,
    onPath: pts.length ? onCount / pts.length : 0,
    direction: fwd + back ? fwd / (fwd + back) : 0,
    covered,
    ink: pts.map((p): Pt => [p[0], p[1]]),
    on,
    empty: pts.length < 4,
  };
}

/** Free writing has no model under the pen: the ink is first moved and resized onto the model. */
function fitInk(ink: Pt[][], box: Placed["box"]) {
  const all = ink.flat();
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const uw = Math.max(x1 - x0, 1);
  const uh = Math.max(y1 - y0, 1);
  const mw = box.x1 - box.x0;
  const mh = box.y1 - box.y0;
  const mk = (k: number) =>
    ink.map((st) =>
      st.map((p): Pt => [
        box.x0 + mw / 2 + (p[0] - (x0 + x1) / 2) * k,
        box.y0 + mh / 2 + (p[1] - (y0 + y1) / 2) * k,
      ]),
    );
  const dy = (y0 + y1) / 2 - (box.y0 + box.y1) / 2;
  return { byH: mk(mh / uh), byW: mk(mw / uw), size: uh / mh, dy };
}

/**
 * Order-aware comparison for free writing: both lines are cut into the same number of points
 * and matched in order (dynamic time warping), so the right shape written the right way scores
 * high and a scribble in the same place does not.
 */
function seqDist(model: ModelPt[], ink: Pt[][]): number {
  const flat = ink.flatMap((st) => (st.length > 1 ? resample(st, 3) : st));
  if (flat.length < 4) return Infinity;
  const N = Math.max(56, Math.min(360, Math.round(model.length / 8)));
  const W = Math.round(N / 4);
  const pick = <T>(a: T[]) =>
    Array.from({ length: N }, (_, i) => a[Math.round((i * (a.length - 1)) / (N - 1))]!);
  const A = pick(model);
  const U = pick(flat);
  let prev = new Float64Array(N + 1).fill(Infinity);
  prev[0] = 0;
  for (let i = 1; i <= N; i++) {
    const row = new Float64Array(N + 1).fill(Infinity);
    for (let j = Math.max(1, i - W); j <= Math.min(N, i + W); j++) {
      const c = Math.hypot(A[i - 1]![0] - U[j - 1]![0], A[i - 1]![1] - U[j - 1]![1]);
      row[j] = c + Math.min(prev[j]!, row[j - 1]!, prev[j - 1]!);
    }
    prev = row;
  }
  return prev[N]! / N;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** Mark a learner's ink against the placed model. `ink` is in page pixels, stroke by stroke. */
export function grade(P: Placed, ink: Pt[][], mode: Mode): Grade {
  const tol = Math.max(mode === "trace" ? 7 : 9, (mode === "trace" ? 48 : 60) * P.s);
  const strokes = ink.filter((s) => s.length > 0);
  if (strokes.flat().length < 4) {
    const m = measure(P.pts, [], tol);
    return { ...m, match: 0, score: 0, empty: true, codes: ["empty"] };
  }
  let g: Omit<Grade, "codes" | "score">;
  let raw: number;
  if (mode === "trace") {
    const m = measure(P.pts, strokes, tol);
    g = { ...m, match: m.onPath };
    raw = m.coverage ** 1.5 * (0.3 + 0.7 * m.onPath) * (0.7 + 0.3 * m.direction);
  } else {
    const fit = fitInk(strokes, P.box);
    const one = (f: Pt[][]) => {
      const m = measure(P.pts, f, tol);
      const fw = seqDist(P.pts, f) / P.xh;
      const bw = seqDist(P.pts, f.map((st) => st.slice().reverse()).reverse()) / P.xh;
      const seq = clamp(1 - (Math.min(fw, bw) - 0.12) / 0.55);
      return { ...m, seq, direction: bw + 0.08 < fw ? Math.min(m.direction, 0.3) : m.direction };
    };
    const a = one(fit.byH);
    const b = one(fit.byW);
    const m = a.coverage * (0.3 + 0.7 * a.seq) >= b.coverage * (0.3 + 0.7 * b.seq) ? a : b;
    // The writing should sit where the model sits: on the lines, not above or below them.
    const lineOk = Math.abs(fit.dy) < P.xh * 0.6;
    const sizeOk = fit.size > 0.6 && fit.size < 1.55;
    g = { ...m, match: m.seq, size: fit.size, sizeOk, lineOk };
    raw =
      m.coverage ** 1.2 *
      (0.2 + 0.8 * m.seq) *
      (0.7 + 0.3 * m.direction) *
      (0.7 + (sizeOk ? 0.15 : 0) + (lineOk ? 0.15 : 0));
  }
  // A human hand never lands exactly on the model: the top of the scale is reached a little early.
  const score = Math.max(0, Math.min(100, Math.round((raw / 0.9) * 100)));
  const codes: TipCode[] = [];
  if (g.coverage < 0.8) codes.push("missed");
  if (g.match < 0.8) codes.push(mode === "trace" ? "offPath" : "shape");
  if (g.direction < 0.75) codes.push("direction");
  if (g.sizeOk === false) codes.push((g.size ?? 1) < 1 ? "small" : "big");
  if (g.lineOk === false) codes.push("offLine");
  if (!codes.length) codes.push("good");
  return { ...g, score, codes };
}
