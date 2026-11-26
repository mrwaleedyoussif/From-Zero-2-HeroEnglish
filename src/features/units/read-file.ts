import "server-only";
import { readBooklet } from "@/features/step/booklet";
import { readMock } from "@/features/step/mock";
import { mockToDoc } from "@/features/step/mock-doc";
import { bookletToUnits } from "@/features/step/to-units";
import { docxText } from "@/lib/docx/text";

/** Booklet part files of the STEP Foundation pack (the MASTER files repeat them). */
export const STEP_BOOKLET = /^STEP_F_B[1-4]_[A-Za-z]+_Unit\d_(A1|A2|B1|B2|B2plus)_Part[12]\.docx$/;
/** The pack's full mock exams. */
export const STEP_MOCK = /^STEP_F_Mock_\d{2}\.docx$/;

/**
 * The unit documents in one Drive file: a JSON file holds one unit; a STEP booklet part
 * (.docx) holds several lessons, each becoming a unit. Returns a reason when it can't be read.
 */
export function unitDocsIn(
  path: string,
  bytes: Uint8Array,
): { docs: unknown[]; mock?: unknown } | { problem: string } {
  const name = path.split("/").pop() ?? path;
  if (name.toLowerCase().endsWith(".docx")) {
    let text: string;
    try {
      text = docxText(bytes);
    } catch {
      return { problem: "is not a Word document that can be read" };
    }
    if (STEP_MOCK.test(name)) {
      const mock = readMock(name, text);
      return mock?.sections.length
        ? { docs: [], mock: mockToDoc(mock) }
        : { problem: "has no mock exam in it" };
    }
    const book = readBooklet(name, text);
    if (!book || book.lessons.length === 0) return { problem: "has no STEP lessons in it" };
    return { docs: bookletToUnits(book) };
  }
  try {
    return { docs: [JSON.parse(new TextDecoder().decode(bytes).replace(/^﻿/, ""))] };
  } catch {
    return { problem: "is not valid JSON" };
  }
}
