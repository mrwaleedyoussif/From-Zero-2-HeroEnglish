import { describe, expect, it } from "vitest";
import { paceFor, rankVoices, sentences, voiceScore } from "./voice";

describe("device voice", () => {
  it("speaks slower for lower levels and never faster than normal", () => {
    expect(paceFor("A1")).toBeLessThan(paceFor("A2"));
    expect(paceFor("A2")).toBeLessThan(paceFor("B1"));
    expect(paceFor("B1")).toBeLessThan(paceFor("B2"));
    expect(paceFor("C2")).toBe(1);
    expect(paceFor(undefined)).toBe(0.85);
  });

  it("prefers the natural English voices and never a foreign or robotic one", () => {
    const voices = [
      { name: "eSpeak English", lang: "en-GB" },
      { name: "Majed", lang: "ar-SA" },
      { name: "Google UK English Female", lang: "en-GB" },
      { name: "Microsoft Sonia Online (Natural) - English (United Kingdom)", lang: "en-GB" },
      { name: "Samantha", lang: "en-US" },
    ];
    const ranked = rankVoices(voices).map((v) => v.name);
    expect(ranked[0]).toContain("Natural");
    expect(ranked[1]).toContain("Google");
    expect(ranked).not.toContain("Majed");
    expect(ranked).not.toContain("eSpeak English");
    expect(voiceScore({ name: "Majed", lang: "ar-SA" })).toBe(-1);
  });

  it("splits a text into sentences", () => {
    expect(sentences("Reem has a phone. Is it new? Yes!")).toEqual([
      "Reem has a phone.",
      "Is it new?",
      "Yes!",
    ]);
    expect(sentences("apple")).toEqual(["apple"]);
  });
});
