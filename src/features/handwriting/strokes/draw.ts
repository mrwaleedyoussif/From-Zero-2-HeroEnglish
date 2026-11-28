import type { Pt } from "./geometry";
import type { Grade } from "./grade";
import type { Guide, Placed } from "./place";

type Ctx = CanvasRenderingContext2D;
const INK = "#1D3FAA";
const MODEL = "#2E3074";
const START = "#22B573";
const ARROW = "#D9480F";
const MISSED = "#E0445C";

/** Size a canvas for sharp lines on any screen; returns its drawing context. */
export function setup(cv: HTMLCanvasElement, w: number, h: number): Ctx {
  const r = Math.min(window.devicePixelRatio || 1, 3);
  cv.width = Math.round(w * r);
  cv.height = Math.round(h * r);
  cv.style.height = `${h}px`;
  const c = cv.getContext("2d")!;
  c.setTransform(r, 0, 0, r, 0, 0);
  c.lineCap = c.lineJoin = "round";
  return c;
}

/** The four writing lines of every row: top, dashed middle, red base line, dotted tail line. */
export function drawLines(c: Ctx, rows: Guide[], w: number) {
  c.save();
  c.lineWidth = 1.5;
  for (const L of rows) {
    const lines: [number, string, number[]][] = [
      [L.asc, "#C9D6EE", []],
      [L.mid, "#9DB7E8", [8, 7]],
      [L.base, "#E0566F", []],
      [L.desc, "#DDE4F1", [3, 6]],
    ];
    for (const [y, col, dash] of lines) {
      c.strokeStyle = col;
      c.setLineDash(dash);
      c.beginPath();
      c.moveTo(8, y);
      c.lineTo(w - 8, y);
      c.stroke();
    }
  }
  c.restore();
}

export function path(c: Ctx, st: Pt[], upto?: number) {
  const n = Math.min(upto ?? st.length, st.length);
  if (n === 1) {
    c.save();
    c.fillStyle = c.strokeStyle;
    c.beginPath();
    c.arc(st[0]![0], st[0]![1], c.lineWidth / 2, 0, 7);
    c.fill();
    c.restore();
    return;
  }
  c.beginPath();
  for (let i = 0; i < n; i++) {
    if (i) c.lineTo(st[i]![0], st[i]![1]);
    else c.moveTo(st[i]![0], st[i]![1]);
  }
  c.stroke();
}

export const inkWidth = (P: Placed) => Math.max(3.5, 30 * P.s);

export function drawModel(c: Ctx, P: Placed, col: string, width: number, dash?: number[]) {
  c.save();
  c.strokeStyle = col;
  c.lineWidth = width;
  if (dash) c.setLineDash(dash);
  P.strokes.forEach((st) => path(c, st));
  c.restore();
}

/** Where to start (numbered green dots) and which way to go (arrows along the path). */
export function drawDirections(c: Ctx, P: Placed) {
  const s = P.s;
  const gap = Math.max(19, Math.round(46 / (9 * s)));
  const a = Math.max(4, 30 * s);
  c.save();
  c.strokeStyle = ARROW;
  c.lineWidth = Math.max(1.5, 7 * s);
  for (const st of P.strokes)
    for (let i = Math.floor(gap * 0.6); i < st.length - 2; i += gap) {
      const p = st[i]!;
      const q = st[Math.min(i + 2, st.length - 1)]!;
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      c.beginPath();
      c.moveTo(p[0] - a * Math.cos(ang - 0.5), p[1] - a * Math.sin(ang - 0.5));
      c.lineTo(p[0], p[1]);
      c.lineTo(p[0] - a * Math.cos(ang + 0.5), p[1] - a * Math.sin(ang + 0.5));
      c.stroke();
    }
  // Numbers only while they can be read: a long text has too many strokes for them.
  const numbered = P.strokes.length <= 12;
  const r = Math.max(numbered ? 7 : 3, (numbered ? 34 : 18) * s);
  P.strokes.forEach((st, k) => {
    const p = st[0]!;
    c.beginPath();
    c.fillStyle = START;
    c.arc(p[0], p[1], r, 0, 7);
    c.fill();
    if (!numbered) return;
    c.fillStyle = "#fff";
    c.font = `800 ${Math.round(r * 1.25)}px sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(String(k + 1), p[0], p[1] + r * 0.08);
  });
  c.restore();
}

/** The model being written, up to point `n`, with the pen's tip as a red dot. */
export function drawWriting(c: Ctx, P: Placed, n: number) {
  c.save();
  c.strokeStyle = MODEL;
  c.lineWidth = inkWidth(P);
  let left = n;
  let pen: Pt | null = null;
  for (const st of P.strokes) {
    if (left <= 0) break;
    path(c, st, left);
    pen = st[Math.min(left, st.length) - 1] ?? null;
    left -= st.length;
  }
  c.restore();
  if (pen && n < P.pts.length) {
    c.beginPath();
    c.fillStyle = MISSED;
    c.arc(pen[0], pen[1], Math.max(6, 30 * P.s), 0, 7);
    c.fill();
  }
}

export function drawInk(c: Ctx, P: Placed, ink: Pt[][], faint = false, thin = false) {
  c.save();
  c.strokeStyle = faint ? "rgba(29,63,170,.35)" : INK;
  c.lineWidth = thin ? Math.max(2, inkWidth(P) * 0.5) : inkWidth(P);
  ink.forEach((st) => st.length && path(c, st));
  c.restore();
}

/** After Check: the model in green where it was written and red where it was missed. */
export function drawResult(c: Ctx, P: Placed, g: Grade, offPath: boolean) {
  const r = Math.max(2.2, 15 * P.s);
  P.pts.forEach((q, j) => {
    c.beginPath();
    c.fillStyle = g.covered[j] ? START : MISSED;
    c.arc(q[0], q[1], r, 0, 7);
    c.fill();
  });
  if (!offPath) return;
  const o = Math.max(2, inkWidth(P) * 0.4);
  g.ink.forEach((q, i) => {
    if (g.on[i]) return;
    c.beginPath();
    c.fillStyle = "#F2994A";
    c.arc(q[0], q[1], o, 0, 7);
    c.fill();
  });
}
