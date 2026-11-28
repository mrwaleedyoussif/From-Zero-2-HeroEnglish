import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Someone counts as online when their page spoke in the last few minutes. */
export const ONLINE_MINUTES = 5;
export const isOnline = (seenAt: string | null | undefined, now = Date.now()) =>
  !!seenAt && now - new Date(seenAt).getTime() < ONLINE_MINUTES * 60_000;

/** People I may see and when they were last here (the database applies my rights). */
export async function presence(minutes = ONLINE_MINUTES) {
  const db = await createClient();
  const { data } = await db.rpc("presence_list", { p_minutes: minutes });
  return data ?? [];
}

/** Last-seen times by person, for monitoring pages (the last 30 days). */
export async function lastSeen(): Promise<Map<string, string>> {
  return new Map((await presence(43_200)).map((p) => [p.user_id, p.seen_at]));
}
