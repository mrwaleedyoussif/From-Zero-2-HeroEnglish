import { describe, expect, it } from "vitest";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import { defaultVisibility, isKnownKey, registry } from "./registry";

function label(messages: unknown, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      (messages as { Registry: unknown }).Registry,
    );
}

describe("registry", () => {
  const keys = registry.map((e) => e.key);

  it("has unique keys, each starting with its kind", () => {
    expect(new Set(keys).size).toBe(keys.length);
    for (const e of registry) expect(e.key.startsWith(`${e.kind}.`)).toBe(true);
  });

  it("never uses a key as the prefix of another (labels nest by key)", () => {
    for (const a of keys)
      for (const b of keys) if (a !== b) expect(b.startsWith(`${a}.`)).toBe(false);
  });

  it("has an English and an Arabic label for every key", () => {
    const missing = keys.filter(
      (k) => typeof label(en, k) !== "string" || typeof label(ar, k) !== "string",
    );
    expect(missing).toEqual([]);
  });

  it("covers the acceptance widget and every page has a nav item", () => {
    expect(keys).toContain("widget.teacher.atRiskStudents");
    for (const k of keys.filter((k) => k.startsWith("page.")))
      expect(keys).toContain(k.replace("page.", "nav."));
  });

  it("accepts dynamic content keys and defaults them to visible", () => {
    expect(isKnownKey("department.MAP")).toBe(true);
    expect(isKnownKey("department.")).toBe(false);
    expect(isKnownKey("widget.nope")).toBe(false);
    expect(defaultVisibility("department.MAP")).toBe(true);
    expect(defaultVisibility("module.ai")).toBe(false);
  });
});
