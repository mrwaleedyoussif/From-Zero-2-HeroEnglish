import "server-only";
import { createClient } from "@/lib/supabase/server";

/** The signed-in user's latest notifications with lesson titles filled in (RLS: own rows only). */
export async function myNotifications(userId: string) {
  const db = await createClient();
  const { data } = await db
    .from("notifications")
    .select("id, kind, params, href, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(15);
  const rows = data ?? [];
  const lessonIds = [
    ...new Set(
      rows
        .map((n) => (n.params as { lesson_id?: string } | null)?.lesson_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const { data: lessons } = lessonIds.length
    ? await db.from("lessons").select("id, title_en, title_ar").in("id", lessonIds)
    : { data: [] };
  const titles = new Map((lessons ?? []).map((l) => [l.id, l]));
  return rows.map((n) => {
    const p = (n.params ?? {}) as { lesson_id?: string; due_at?: string | null };
    return {
      ...n,
      lesson: p.lesson_id ? (titles.get(p.lesson_id) ?? null) : null,
      dueAt: p.due_at ?? null,
    };
  });
}
export type MyNotification = Awaited<ReturnType<typeof myNotifications>>[number];
