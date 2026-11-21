import { describe, expect, it } from "vitest";
import { contrastRatio, MIN_CONTRAST, schoolTheme } from "../theme/contrast";
import { effectivePlanKey, freePeriodEnded, grants, limitOf } from "./entitlements";

describe("entitlements", () => {
  const free = [{ key: "*", limit_value: null }];
  const basic = [
    { key: "module.learning", limit_value: null },
    { key: "limit.students", limit_value: 300 },
  ];

  it("the free plan grants everything, unlimited", () => {
    expect(grants(free, "module.ai")).toBe(true);
    expect(limitOf(free, "limit.students")).toBe(Number.POSITIVE_INFINITY);
  });

  it("a paid plan grants only its keys and caps limits", () => {
    expect(grants(basic, "module.learning")).toBe(true);
    expect(grants(basic, "module.ai")).toBe(false);
    expect(limitOf(basic, "limit.students")).toBe(300);
    expect(limitOf(basic, "limit.staff")).toBe(0);
  });

  it("billing off → everyone is on free; billing on → the school's plan", () => {
    expect(effectivePlanKey(false, "school_basic")).toBe("free");
    expect(effectivePlanKey(true, "school_basic")).toBe("school_basic");
    expect(effectivePlanKey(true, null)).toBe("free");
  });

  it("free period ends the day after free_until", () => {
    expect(freePeriodEnded("2026-11-21", "2026-11-22")).toBe(true);
    expect(freePeriodEnded("2026-11-22", "2026-11-22")).toBe(false);
    expect(freePeriodEnded(null, "2026-11-22")).toBe(false);
  });
});

describe("school theme contrast", () => {
  it("accepts the staff navy and derives readable variants", () => {
    const t = schoolTheme("#1E3A8A");
    if (!t.ok) throw new Error("expected ok");
    expect(t.light).toEqual({ primary: "#1e3a8a", primaryForeground: "#ffffff" });
    expect(contrastRatio(t.dark.primary, "#0b1220")).toBeGreaterThanOrEqual(MIN_CONTRAST);
    expect(contrastRatio(t.dark.primary, t.dark.primaryForeground)).toBeGreaterThanOrEqual(
      MIN_CONTRAST,
    );
  });

  it("rejects a pale colour and suggests a darker one that passes", () => {
    const t = schoolTheme("#FDE68A");
    expect(t).toMatchObject({ ok: false, reason: "lowContrast" });
    if (t.ok || t.reason !== "lowContrast") throw new Error("expected lowContrast");
    expect(contrastRatio(t.suggestion, "#f8fafc")).toBeGreaterThanOrEqual(MIN_CONTRAST);
    expect(schoolTheme(t.suggestion).ok).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(schoolTheme("red")).toEqual({ ok: false, reason: "invalid" });
    expect(schoolTheme("#12345")).toEqual({ ok: false, reason: "invalid" });
  });

  it("matches known WCAG ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });
});
