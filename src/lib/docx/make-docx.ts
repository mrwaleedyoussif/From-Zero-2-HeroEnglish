/**
 * A minimal Word file (stored zip, one paragraph per line, "\t" for tabs), for tests only:
 * enough for docxText to read, so tests never need a real booklet.
 */
export function makeDocx(lines: readonly string[]): Uint8Array {
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const para = (l: string) =>
    `<w:p><w:r>${l
      .split("\t")
      .map((part) => `<w:t xml:space="preserve">${esc(part)}</w:t>`)
      .join("<w:tab/>")}</w:r></w:p>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${lines.map(para).join("")}</w:body></w:document>`;
  const name = new TextEncoder().encode("word/document.xml");
  const data = new TextEncoder().encode(xml);
  const local = new Uint8Array(30 + name.length + data.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint32(18, data.length, true);
  lv.setUint32(22, data.length, true);
  lv.setUint16(26, name.length, true);
  local.set(name, 30);
  local.set(data, 30 + name.length);
  const central = new Uint8Array(46 + name.length);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint32(20, data.length, true);
  cv.setUint32(24, data.length, true);
  cv.setUint16(28, name.length, true);
  cv.setUint32(42, 0, true);
  central.set(name, 46);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, 1, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(12, central.length, true);
  ev.setUint32(16, local.length, true);
  const out = new Uint8Array(local.length + central.length + end.length);
  out.set(local, 0);
  out.set(central, local.length);
  out.set(end, local.length + central.length);
  return out;
}

/** A tiny STEP booklet part in the pack's layout: one grammar lesson, its quiz and key. */
export const SAMPLE_BOOKLET = [
  "Lesson 1.1 — Pronouns and be",
  "Unit 1 · Lesson 1.1 · CEFR A1 · STEP link: Sentence Structure",
  "Objectives",
  "1.\tUse am, is and are.",
  "Arab Learner Alert",
  "✗ He a doctor.   →   ✓ He is a doctor.",
  "Classroom Corner — RallyRobin",
  "Teacher's note · partners take turns.",
  "Lesson 1.1 Quiz — 30 Questions",
  "Part A — Sentence Completion (Questions 1–2)",
  "1.\tI ______ a student.",
  "A. is\tB. am\tC. are\tD. be",
  "2.\tThey ______ at school.",
  "A. is",
  "B. am",
  "C. are",
  "D. be",
  "Answer Keys — Lessons 1.1",
  "Lesson 1.1 Quiz — Answer Key",
  "1. B — With I we always use am.",
  "تلميح: مع I نستخدم am.",
  "2. C — They is plural.",
];
