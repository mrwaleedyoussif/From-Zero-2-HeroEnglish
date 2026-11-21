/**
 * Per-school colour override with an automatic WCAG contrast check (SPEC §4, §16).
 * Pure. The school picks one primary colour; we derive light- and dark-mode variants and
 * a readable text colour for each, or reject the colour with a darker suggestion.
 */

const LIGHT_BG = "#f8fafc";
const DARK_BG = "#0b1220";
const DARK_TEXT = "#0f172a";
const WHITE = "#ffffff";
/** WCAG AA for normal text. The primary is used for text (headings, links) and buttons. */
export const MIN_CONTRAST = 4.5;

export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m?.[1]) return null;
  const v = Number.parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Blend towards a target colour by t ∈ [0, 1]. */
function mix(hex: string, target: string, t: number): string {
  const a = parseHex(hex) ?? [0, 0, 0];
  const b = parseHex(target) ?? [0, 0, 0];
  return toHex([0, 1, 2].map((i) => a[i]! + (b[i]! - a[i]!) * t) as [number, number, number]);
}

function readableOn(bg: string): string {
  return contrastRatio(bg, WHITE) >= contrastRatio(bg, DARK_TEXT) ? WHITE : DARK_TEXT;
}

/** Smallest blend toward `target` that reaches MIN_CONTRAST against `bg`. */
function adjust(hex: string, target: string, bg: string): string {
  for (let step = 0; step <= 20; step++) {
    const c = mix(hex, target, step / 20);
    if (contrastRatio(c, bg) >= MIN_CONTRAST) return c;
  }
  return target;
}

export interface ThemeVariant {
  primary: string;
  primaryForeground: string;
}

export type SchoolThemeResult =
  | { ok: true; light: ThemeVariant; dark: ThemeVariant }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "lowContrast"; ratio: number; suggestion: string };

export function schoolTheme(primary: string): SchoolThemeResult {
  const rgb = parseHex(primary);
  if (!rgb) return { ok: false, reason: "invalid" };
  const light = toHex(rgb);
  const ratio = contrastRatio(light, LIGHT_BG);
  if (ratio < MIN_CONTRAST) {
    return {
      ok: false,
      reason: "lowContrast",
      ratio: Math.round(ratio * 100) / 100,
      suggestion: adjust(light, "#000000", LIGHT_BG),
    };
  }
  // Dark mode: lighten the brand colour until it reads on the dark background.
  const dark = adjust(light, WHITE, DARK_BG);
  return {
    ok: true,
    light: { primary: light, primaryForeground: readableOn(light) },
    dark: { primary: dark, primaryForeground: readableOn(dark) },
  };
}
