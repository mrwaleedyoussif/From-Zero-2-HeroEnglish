import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Reminders go out with the daily tick, so "soon" covers until the evening of the next day. */
const SOON_MS = 36 * 3_600_000;

/**
 * In-app "due soon" reminders (SPEC §12): once per learner per assignment, for work that is
 * not finished and is due within the next day and a half. Returns how many were sent.
 */
export async function notifyDueSoon(admin: Admin, now: Date): Promise<number> {
  const { data: due, error } = await admin
    .from("assignments")
    .select("id, lesson_id, school_id, due_at")
    .gt("due_at", now.toISOString())
    .lte("due_at", new Date(now.getTime() + SOON_MS).toISOString())
    .order("due_at")
    .limit(500);
  if (error) throw new Error(`due soon: ${error.message}`);
  let sent = 0;
  for (const a of due ?? []) {
    const [{ data: open }, { data: reminded }] = await Promise.all([
      admin
        .from("assignment_progress")
        .select("student_id")
        .eq("assignment_id", a.id)
        .neq("status", "done"),
      admin
        .from("notifications")
        .select("user_id")
        .eq("kind", "due_soon")
        .eq("params->>assignment_id", a.id),
    ]);
    const already = new Set((reminded ?? []).map((n) => n.user_id));
    const rows = (open ?? [])
      .filter((p) => !already.has(p.student_id))
      .map((p) => ({
        user_id: p.student_id,
        school_id: a.school_id,
        kind: "due_soon",
        params: { lesson_id: a.lesson_id, assignment_id: a.id, due_at: a.due_at },
        href: "/student/lessons",
      }));
    if (!rows.length) continue;
    const { error: insertError } = await admin.from("notifications").insert(rows);
    if (insertError) throw new Error(`due soon: ${insertError.message}`);
    sent += rows.length;
  }
  return sent;
}
