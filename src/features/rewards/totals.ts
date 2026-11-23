import type { SupabaseClient } from "@supabase/supabase-js";
import { PAGE, selectAll } from "@/lib/supabase/batch";
import type { Database } from "@/types/db";

type Db = SupabaseClient<Database>;

/**
 * Totals over a learner's whole history. The API returns at most 1000 rows per request, so an
 * active learner's events are read page by page — one unpaged read would freeze their XP, level
 * and coin balance at the first 1000 events.
 */
export async function totalXp(db: Db, studentId: string): Promise<number> {
  const { data } = await selectAll(
    (after) => {
      const q = db.from("xp_events").select("id, xp").eq("student_id", studentId);
      return (after ? q.gt("id", after) : q).order("id").limit(PAGE);
    },
    (r) => r.id,
  );
  return (data ?? []).reduce((s, r) => s + r.xp, 0);
}

export async function coinBalance(db: Db, studentId: string): Promise<number> {
  const { data } = await selectAll(
    (after) => {
      const q = db.from("coin_ledger").select("id, delta").eq("student_id", studentId);
      return (after ? q.gt("id", after) : q).order("id").limit(PAGE);
    },
    (r) => r.id,
  );
  return (data ?? []).reduce((s, r) => s + r.delta, 0);
}
