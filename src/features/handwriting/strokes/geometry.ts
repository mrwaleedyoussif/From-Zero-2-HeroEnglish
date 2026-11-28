import cursive from "./cursive.json";
import print from "./print.json";

/**
 * Letters as pen strokes in writing order (single-stroke Hershey Sans and Hershey Script; the
 * Hershey Fonts were created by Dr. A. V. Hershey at the U.S. National Bureau of Standards).
 * The same method as the Owner's earlier app: a text becomes the path a pen follows, so the app
 * can show where to start, animate the writing and measure a learner's own line against it.
 */
export type Pt = [number, number];
type Glyph = [number, number[][]];
export type StrokeFont = { xh: number; asc: number; desc: number; g: Record<string, Glyph> };
export type Style = "print" | "cursive";

const FONTS = { print, cursive } as unknown as Record<Style, StrokeFont>;
export const fontOf = (style: Style): StrokeFont => FONTS[style];

/** Corner cutting: turns the font's straight segments into a smooth curve. */
export function chaikin(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts;
  const o: Pt[] = [pts[0]!];
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i]!;
    const q = pts[i + 1]!;
    o.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25]);
    o.push([p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
  }
  o.push(pts[pts.length - 1]!);
  return o;
}

/** Points the same distance apart along a line, so every part of it counts the same. */
export function resample(pts: Pt[], step: number): Pt[] {
  const o: Pt[] = [pts[0]!];
  let need = step;
  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1]!;
    const b = pts[i]!;
    let seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (seg >= need) {
      const t = need / seg;
      a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      o.push(a);
      seg -= need;
      need = step;
    }
    need -= seg;
  }
  const l = pts[pts.length - 1]!;
  const e = o[o.length - 1]!;
  if (Math.hypot(l[0] - e[0], l[1] - e[1]) > step * 0.4) o.push(l);
  return o;
}

const size = (s: Pt[]) => {
  const xs = s.map((p) => p[0]);
  const ys = s.map((p) => p[1]);
  return Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys);
};

/** Strokes that start where the last one ended are one movement of the pen. */
function join(list: Pt[][], gap: number): Pt[][] {
  const o: Pt[][] = [];
  for (const p of list) {
    const last = o[o.length - 1];
    const e = last?.[last.length - 1];
    if (last && e && Math.hypot(e[0] - p[0]![0], e[1] - p[0]![1]) <= gap) last.push(...p);
    else o.push(p.slice());
  }
  return o;
}

const SPACE = 300;
export const widthOf = (font: StrokeFont, text: string) =>
  [...text].reduce((w, ch) => w + (font.g[ch]?.[0] ?? SPACE), 0);

/** One row of text → smooth strokes in font units (y up, 0 = the base line). */
export function rowStrokes(style: Style, text: string): Pt[][] {
  const font = fontOf(style);
  const raw: Pt[][] = [];
  let x = 0;
  for (const ch of text) {
    const g = font.g[ch];
    if (!g) {
      x += SPACE;
      continue;
    }
    const gs = g[1].map((s) => {
      const p: Pt[] = [];
      for (let i = 0; i < s.length; i += 2) p.push([s[i]! + x, s[i + 1]!]);
      return p;
    });
    // The body first, the dot last (i, j, and the marks ? !).
    if ("ij?!".includes(ch) && gs.length > 1) {
      const dot = gs.reduce((a, b) => (size(b) < size(a) ? b : a));
      gs.splice(gs.indexOf(dot), 1);
      gs.push(dot);
    }
    // Inside a cursive letter the pen stays down across a short retrace (u, n, m, y…).
    raw.push(...join(gs, style === "cursive" ? 110 : 12));
    x += g[0];
  }
  // In cursive, a letter that starts where the last one ended is joined to it.
  const st = style === "cursive" ? join(raw, 48) : raw;
  return st.map((p) => (p.length > 1 ? resample(chaikin(chaikin(p)), 9) : p));
}

/** Break a text into rows no wider than `max` font units (a long word gets its own row). */
export function wrap(font: StrokeFont, text: string, max: number): string[] {
  const rows: string[] = [];
  let row = "";
  for (const word of text.trim().split(/\s+/)) {
    const next = row ? `${row} ${word}` : word;
    if (row && widthOf(font, next) > max) {
      rows.push(row);
      row = word;
    } else row = next;
  }
  if (row) rows.push(row);
  return rows;
}
