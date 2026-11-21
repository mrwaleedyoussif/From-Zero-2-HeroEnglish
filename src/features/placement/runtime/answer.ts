import "server-only";
import { ActionError } from "@/lib/action-result";
import type { Actor } from "@/lib/auth/session";
import { itemB } from "../engine/rasch";
import { isCorrect, type ItemType } from "../engine/scoring";
import { advance, ownSession } from "./session";

/**
 * Record the answer to the item currently served — and only that one (no going back) —
 * score it on the server, then advance the adaptive test.
 */
export async function submitAnswer(
  actor: Actor,
  sessionId: string,
  itemId: string,
  answer: string | string[],
): Promise<"continue" | "done"> {
  const { admin, s } = await ownSession(actor, sessionId);
  if (s.status !== "in_progress") throw new ActionError("testClosed");
  if (s.current_item_id !== itemId) throw new ActionError("notCurrentItem");

  const { data: item } = await admin
    .from("items")
    .select("item_type, correct, version, skill_id, difficulty, b_calibrated")
    .eq("id", itemId)
    .single();
  if (!item) throw new ActionError("notFound");

  const servedAt = s.current_served_at ? new Date(s.current_served_at).getTime() : Date.now();
  const { error } = await admin.from("responses").insert({
    session_id: s.id,
    student_id: s.student_id,
    school_id: s.school_id,
    item_id: itemId,
    item_version: item.version,
    skill_id: item.skill_id,
    seq: s.items_count + 1,
    answer,
    correct: isCorrect(item.item_type as ItemType, item.correct, answer),
    time_ms: Math.max(0, Date.now() - servedAt),
    b_used: itemB({
      difficulty: item.difficulty,
      b_calibrated: item.b_calibrated === null ? null : Number(item.b_calibrated),
    }),
  });
  // A double click sends the same answer twice: the unique (session, item) key rejects it.
  if (error) throw new ActionError(error.code === "23505" ? "alreadyAnswered" : "failed");

  const result = await advance(admin, { ...s, items_count: s.items_count + 1 });
  const { data: after } = await admin
    .from("test_sessions")
    .select("theta, se")
    .eq("id", s.id)
    .single();
  await admin
    .from("responses")
    .update({ theta_after: after?.theta ?? null, se_after: after?.se ?? null })
    .eq("session_id", s.id)
    .eq("item_id", itemId);
  return result;
}

export async function recordTabSwitch(actor: Actor, sessionId: string): Promise<void> {
  const { admin, s } = await ownSession(actor, sessionId);
  if (s.status !== "in_progress") return;
  await admin
    .from("test_sessions")
    .update({ tab_switches: s.tab_switches + 1 })
    .eq("id", s.id);
}
