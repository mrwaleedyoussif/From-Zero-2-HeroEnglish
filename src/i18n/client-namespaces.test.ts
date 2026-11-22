import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import { CLIENT_NAMESPACES } from "./client-namespaces";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

describe("client message namespaces", () => {
  it("includes every namespace used with useTranslations (else the browser misses texts)", () => {
    const used = new Set<string>();
    for (const f of files(join(__dirname, "..")))
      for (const m of readFileSync(f, "utf8").matchAll(/useTranslations\("([A-Za-z]+)"\)/g))
        used.add(m[1] as string);
    expect(
      [...used].filter((ns) => !(CLIENT_NAMESPACES as readonly string[]).includes(ns)),
    ).toEqual([]);
    for (const ns of CLIENT_NAMESPACES) expect(en).toHaveProperty(ns);
  });
});
