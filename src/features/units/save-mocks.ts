import "server-only";
import { createHash } from "node:crypto";
import type { Mock } from "@/features/mocks/schema";
import { check } from "@/lib/action-result";
import type { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/db";
import type { UnitsImportResult } from "./import";

/** Save the mock exams of a batch; unchanged ones are counted and left alone. */
export async function saveMocks(
  db: Awaited<ReturnType<typeof createClient>>,
  mocks: Mock[],
  result: UnitsImportResult,
): Promise<number> {
  if (mocks.length === 0) return 0;
  const { data: known } = await db
    .from("mock_exams")
    .select("id, hash")
    .in(
      "id",
      mocks.map((m) => m.id),
    );
  const hashes = new Map((known ?? []).map((m) => [m.id, m.hash]));
  const rows = mocks.flatMap((m) => {
    const hash = createHash("sha256").update(JSON.stringify(m)).digest("hex");
    if (hashes.get(m.id) === hash) {
      result.unchanged++;
      return [];
    }
    return [
      {
        id: m.id,
        title: m.title,
        set_code: m.set,
        content: m as unknown as NonNullable<Json>,
        hash,
      },
    ];
  });
  if (rows.length) check(await db.from("mock_exams").upsert(rows, { onConflict: "id" }));
  return rows.length;
}
