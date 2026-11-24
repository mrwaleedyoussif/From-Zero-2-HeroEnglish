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
      "ghars",
      "mcgrawHill",
      "mapTest",
      "step",
      "ielts",
      "sat",
      "gat",
    ]);
  });

  it("marks every department as coming soon, STEP included", () => {
    for (const a of AUDIENCES) expect(CATALOG[a].every((d) => d.soon)).toBe(true);
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
