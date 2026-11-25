/**
 * Word pictures drawn by the AI reader are SVG text. Before one is kept it must be a plain
 * drawing: shapes and colours only, nothing that could run, load or link to anything.
 */
const SHAPES = new Set([
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polygon", "polyline", "defs",
  "lineargradient", "radialgradient", "stop", "title",
]); // prettier-ignore
const UNSAFE = /\bon[a-z]+\s*=|href|javascript:|data:|url\(\s*["']?(?!#)|<!|<\?|&#|\bstyle\b/i;

/** The drawing, ready to save, or null when it is not a plain safe SVG. */
export function cleanSvg(input: string): string | null {
  const svg = input.trim();
  if (svg.length < 40 || svg.length > 8000) return null;
  if (!/^<svg[\s>]/i.test(svg) || !/<\/svg>$/i.test(svg) || UNSAFE.test(svg)) return null;
  const tags = [...svg.matchAll(/<\/?\s*([a-zA-Z][\w:-]*)/g)].map((m) =>
    (m[1] ?? "").toLowerCase(),
  );
  if (tags.some((tag) => !SHAPES.has(tag))) return null;
  return /\sxmlns=/.test(svg)
    ? svg
    : svg.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}

/** Drive file names: "<word id>.svg" for a picture, "<word id>.none.txt" when no picture fits. */
export const pictureFile = (wordId: string, drawn: boolean) =>
  drawn ? `${wordId}.svg` : `${wordId}.none.txt`;
