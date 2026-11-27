import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import ar from "../../../messages/ar.json";
import { AUDIENCES, audienceFor, CATALOG, isAudience } from "./catalog";

describe("department catalogue", () => {
  it("gives general learners and Andalus International their own lists", () => {
    expect(CATALOG.general.map((d) => d.key)).toEqual([
      "phonics",
      "listeningSpeaking",
      "shadowing",
      "readingWriting",
      "languageUsage",
      "handwriting",
      "cursiveHandwriting",
      "step",
      "ielts",
      "sat",
      "gat",
    ]);
    expect(CATALOG["andalus-international"].map((d) => d.key)).toEqual([
      "phonics",
      "listeningSpeaking",
      "shadowing",
      "readingWriting",
      "languageUsage",
      "handwriting",
      "cursiveHandwriting",
      "ghars",
      "mcgrawHill",
      "mapTest",
      "step",
      "ielts",
      "sat",
      "gat",
    ]);
  });

  it("opens the unit departments, handwriting and STEP for everyone; the rest say Soon", () => {
    const open = AUDIENCES.flatMap((a) =>
      CATALOG[a].filter((d) => !d.soon).map((d) => `${a}:${d.key}:${d.strand ?? d.home}`),
    );
    expect(open).toEqual([
      "general:listeningSpeaking:LS",
      "general:shadowing:SH",
      "general:readingWriting:RW",
      "general:languageUsage:LU",
      "general:handwriting:/student/handwriting/print",
      "general:cursiveHandwriting:/student/handwriting/cursive",
      "general:step:/student/step",
      "andalus-international:listeningSpeaking:LS",
      "andalus-international:shadowing:SH",
      "andalus-international:readingWriting:RW",
      "andalus-international:languageUsage:LU",
      "andalus-international:handwriting:/student/handwriting/print",
      "andalus-international:cursiveHandwriting:/student/handwriting/cursive",
      "andalus-international:step:/student/step",
    ]);
  });

  it("gives every department on a list a colour of its own", () => {
    for (const a of AUDIENCES) {
      const hues = CATALOG[a].map((d) => d.hue);
      expect(new Set(hues).size, a).toBe(hues.length);
    }
  });

  it("has a name in both languages for every department and part", () => {
    for (const messages of [en, ar]) {
      const names = messages.Departments.names as Record<string, string>;
      const parts = messages.Departments.parts as Record<string, string>;
      for (const a of AUDIENCES) {
        expect(messages.Departments.audience[a]).toBeTruthy();
        for (const d of CATALOG[a]) {
          expect(names[d.key], d.key).toBeTruthy();
          for (const p of d.inside ?? []) expect(parts[p], p).toBeTruthy();
        }
      }
    }
  });

  it("picks the list by school", () => {
    expect(audienceFor({ code: "GENERAL", name_en: "General learners" })).toBe("general");
    expect(
      audienceFor({ code: "AIS01", name_en: "Andalus International Schools · Taif Boys" }),
    ).toBe("andalus-international");
    expect(
      audienceFor({ code: "APS01", name_en: "Alandalus Private Schools · Primary Taif Boys" }),
    ).toBeNull();
    expect(isAudience("general")).toBe(true);
    expect(isAudience("nope")).toBe(false);
  });
});
