import { describe, expect, it } from "vitest";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

function keysOf(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keysOf(v, prefix ? `${prefix}.${k}` : k));
}

describe("messages", () => {
  it("en and ar define exactly the same keys", () => {
    expect(keysOf(ar).sort()).toEqual(keysOf(en).sort());
  });

  it("has no empty strings", () => {
    for (const [name, messages] of Object.entries({ en, ar })) {
      const empty = keysOf(messages).filter((path) => {
        const leaf = path
          .split(".")
          .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], messages);
        return typeof leaf === "string" && leaf.trim() === "";
      });
      expect(empty, `${name} has empty messages`).toEqual([]);
    }
  });
});
