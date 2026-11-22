import { describe, expect, it } from "vitest";
import { byCode, chunks, inBatches, selectAll } from "./batch";

describe("batch helpers for large imports", () => {
  it("splits items into batches", () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunks([], 2)).toEqual([]);
  });

  it("reads every page after the last key, until a short page", async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => ({ code: String(i).padStart(5, "0") }));
    const calls: (string | null)[] = [];
    const res = await selectAll(
      async (after) => {
        calls.push(after);
        const rest = after === null ? rows : rows.filter((r) => r.code > after);
        return { data: rest.slice(0, 1000), error: null };
      },
      (r) => r.code,
    );
    expect(res.data).toHaveLength(2500);
    expect(calls).toEqual([null, "00999", "01999"]);
  });

  it("builds a keyset page on the code column", () => {
    const log: string[] = [];
    const q = {
      gt: (c: "code", v: string) => (log.push(`gt ${c} ${v}`), q),
      order: (c: "code") => (
        log.push(`order ${c}`),
        { limit: (n: number) => (log.push(`limit ${n}`), q) }
      ),
    };
    byCode(q, null);
    byCode(q, "X1");
    expect(log).toEqual(["order code", "limit 1000", "gt code X1", "order code", "limit 1000"]);
  });

  it("joins batch results and stops at the first error", async () => {
    const ok = await inBatches(
      [1, 2, 3],
      async (b) => ({ data: b.map((x) => x * 10), error: null }),
      2,
    );
    expect(ok.data).toEqual([10, 20, 30]);
    let calls = 0;
    const bad = await inBatches(
      [1, 2, 3],
      async () => {
        calls++;
        return { data: null, error: { message: "boom" } };
      },
      2,
    );
    expect(bad).toEqual({ data: null, error: { message: "boom" } });
    expect(calls).toBe(1);
    const failedPage = await selectAll(
      async () => ({ data: null, error: { message: "x" } }),
      () => "",
    );
    expect(failedPage.error?.message).toBe("x");
  });
});
