import "server-only";
import { gzipSync } from "node:zlib";
import { toCsv } from "@/features/insights/analytics";
import { getStorage } from "@/lib/storage";
import { findLayoutFolder } from "@/lib/storage/layout";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export const ARCHIVE_AFTER_MONTHS = 6;
export const BATCH = 5000;

/**
 * DB budget guard (SPEC §12): move answers older than 6 months to Drive
 * (05_Archive/responses/*.csv.gz), keep monthly per-student/per-skill totals, then delete them.
 * One batch per run; returns true when more old rows remain (the job runs again).
 */
export async function archiveResponses(admin: Admin, now: Date): Promise<boolean> {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - ARCHIVE_AFTER_MONTHS);
  const { data: rows, error } = await admin
    .from("responses")
    .select(
      "id, session_id, student_id, item_id, item_version, skill_id, seq, correct, time_ms, b_used, theta_after, created_at",
    )
    .lt("created_at", cutoff.toISOString())
    .order("created_at")
    .limit(BATCH);
  if (error) throw error;
  if (!rows?.length) return false;

  // 1. The raw rows to Drive first: nothing is deleted unless the upload succeeded.
  const storage = await getStorage();
  const folder = await findLayoutFolder(storage, "05_Archive/responses");
  if (!folder) throw new Error("05_Archive/responses folder missing");
  const headers = Object.keys(rows[0] as object);
  const csv = toCsv(
    headers,
    rows.map((r) => headers.map((h) => (r as Record<string, unknown>)[h])),
  );
  const first = rows[0]?.created_at.slice(0, 10);
  const last = rows.at(-1)?.created_at.slice(0, 10);
  await storage.upload(
    folder,
    `responses-${first}-${last}-${rows.length}.csv.gz`,
    "application/gzip",
    new Uint8Array(gzipSync(csv)),
  );

  // 2. Monthly totals stay queryable (growth history without the raw rows).
  const totals = new Map<
    string,
    { student_id: string; skill_id: string; month: string; answered: number; correct: number }
  >();
  for (const r of rows) {
    const month = `${r.created_at.slice(0, 7)}-01`;
    const k = `${r.student_id}/${r.skill_id}/${month}`;
    const t = totals.get(k) ?? {
      student_id: r.student_id,
      skill_id: r.skill_id,
      month,
      answered: 0,
      correct: 0,
    };
    t.answered += 1;
    t.correct += r.correct ? 1 : 0;
    totals.set(k, t);
  }
  const keys = [...totals.values()];
  const { data: existing } = await admin
    .from("response_aggregates")
    .select("student_id, skill_id, month, answered, correct")
    .in("student_id", [...new Set(keys.map((k) => k.student_id))]);
  const merged = keys.map((k) => {
    const e = existing?.find(
      (x) => x.student_id === k.student_id && x.skill_id === k.skill_id && x.month === k.month,
    );
    return e ? { ...k, answered: k.answered + e.answered, correct: k.correct + e.correct } : k;
  });
  const { error: aggError } = await admin.from("response_aggregates").upsert(merged);
  if (aggError) throw aggError;

  // 3. Free the space.
  const ids = rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 500)
    await admin
      .from("responses")
      .delete()
      .in("id", ids.slice(i, i + 500));
  return rows.length === BATCH;
}
