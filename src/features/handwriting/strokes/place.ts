import { fontOf, type Pt, rowStrokes, type Style, widthOf, wrap } from "./geometry";

/** A point of the model on the page: x, y and which stroke it belongs to. */
export type ModelPt = [number, number, number];
export type Guide = { asc: number; mid: number; base: number; desc: number };
export type Placed = {
  /** Pixels for one font unit. */
  s: number;
  w: number;
  h: number;
  /** Height of the small letters in pixels. */
  xh: number;
  strokes: Pt[][];
  pts: ModelPt[];
  /** The four writing lines of each row. */
  rows: Guide[];
  box: { x0: number; x1: number; y0: number; y1: number };
};

const PAD = 18;
const GAP = 160;

/**
 * Lay a text out on a page `w` pixels wide: one row when it fits at a good size, more rows when
 * it does not. The page's height follows from the rows.
 */
export function place(style: Style, text: string, w: number, opts?: { maxH?: number }): Placed {
  const font = fontOf(style);
  const rowH = font.asc - font.desc + GAP;
  const maxH = opts?.maxH ?? 300;
  const inner = Math.max(60, w - 2 * PAD);
  // Small letters tall enough for a finger to follow: a long text takes more rows, not less size.
  const minS = (w < 500 ? 24 : 34) / font.xh;
  const longest = Math.max(...text.split(/\s+/).map((x) => widthOf(font, x)));
  const rowsText = wrap(font, text, Math.max(longest, inner / minS));
  const widest = Math.max(...rowsText.map((r) => widthOf(font, r)), 1);
  const s = Math.min(inner / widest, maxH / rowH);
  const h = Math.round(rowH * s * rowsText.length);
  const strokes: Pt[][] = [];
  const rows: Guide[] = [];
  rowsText.forEach((row, r) => {
    const rw = widthOf(font, row) * s;
    const ox = rowsText.length === 1 ? (w - rw) / 2 : PAD;
    const top = r * rowH * s + (GAP / 2) * s;
    const Y = (y: number) => top + (font.asc - y) * s;
    rows.push({ asc: Y(font.asc), mid: Y(font.xh), base: Y(0), desc: Y(font.desc) });
    for (const st of rowStrokes(style, row)) strokes.push(st.map((p) => [ox + p[0] * s, Y(p[1])]));
  });
  const pts: ModelPt[] = strokes.flatMap((st, k) => st.map((p): ModelPt => [p[0], p[1], k]));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return {
    s,
    w,
    h,
    xh: font.xh * s,
    strokes,
    pts,
    rows,
    box: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) },
  };
}
