import { inflateRawSync } from "node:zlib";

/**
 * The text of a Word (.docx) file, one paragraph per line, without any outside library.
 * A .docx is a zip; its body is word/document.xml. Table cells are joined with " | " so a
 * table row stays on one line. Only text is read: no images, styles or embedded objects.
 */
export function docxText(file: Uint8Array): string {
  const xml = unzipEntry(file, "word/document.xml");
  if (!xml) throw new Error("not a Word document");
  return xmlToLines(new TextDecoder().decode(xml));
}

/** One file from a zip archive (stored or deflated), found through the central directory. */
export function unzipEntry(zip: Uint8Array, name: string): Uint8Array | null {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let end = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) return null;
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  for (let n = 0; n < count && at + 46 <= zip.length; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) return null;
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extra = view.getUint16(at + 30, true);
    const comment = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const entry = decoder.decode(zip.subarray(at + 46, at + 46 + nameLength));
    if (entry === name) {
      const start =
        local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const data = zip.subarray(start, start + size);
      if (method === 0) return data;
      if (method === 8) return new Uint8Array(inflateRawSync(data));
      return null;
    }
    at += 46 + nameLength + extra + comment;
  }
  return null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unescape = (v: string) =>
  v.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, e: string) =>
    e[0] === "#"
      ? String.fromCodePoint(
          e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)),
        )
      : (ENTITIES[e] ?? ""),
  );

/** Paragraphs → lines; cells of a table row → one line with " | " between them. */
export function xmlToLines(xml: string): string {
  const body = xml.replace(/<w:tc\b[^>]*>/g, "\u0001").replace(/<\/w:tr>/g, "\u0002");
  const lines: string[] = [];
  let row: string[] | null = null;
  for (const part of body.split(/(\u0001|\u0002|<\/w:p>)/)) {
    if (part === "\u0001") {
      row ??= [];
      row.push("");
      continue;
    }
    if (part === "\u0002") {
      if (row) lines.push(row.map((c) => c.trim()).join(" | "));
      row = null;
      continue;
    }
    if (part === "</w:p>") {
      if (row) row[row.length - 1] += " ";
      continue;
    }
    let text = "";
    for (const m of part.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g))
      text += m[0].startsWith("<w:tab")
        ? "\t"
        : m[0].startsWith("<w:br")
          ? "\n"
          : unescape(m[1] ?? "");
    if (row) row[row.length - 1] += text;
    else lines.push(text);
  }
  return lines
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "");
}
