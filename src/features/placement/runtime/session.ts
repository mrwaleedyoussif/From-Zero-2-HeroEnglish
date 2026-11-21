import "server-only";
import { ActionError } from "@/lib/action-result";
import { assertCan, ReadOnlyError } from "@/lib/auth/can";
import type { Actor } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/db";
import { step } from "../engine/cat";
import { stepRng } from "../engine/rng";
import { loadAnswers, loadBlueprint, loadPool, studentContext } from "./data";
import { finishReceptive } from "./finish";
import { elapsedSec } from "./rules";

export type Admin = ReturnType<typeof createAdminClient>;
export type SessionRow = Tables<"test_sessions">;

/**
 * Load a session for the signed-in student who owns it. The runtime uses the service role
 * (answer keys), so this ownership check is the app half of "authorize twice".
 */
export async function ownSession(
  actor: Actor,
  sessionId: string,
): Promise<{ admin: Admin; s: SessionRow }> {
  if (actor.viewAs) throw new ReadOnlyError();
  await assertCan(actor, "placement:take", { userId: actor.real.id });
  const admin = createAdminClient();
  const { data: s } = await admin
    .from("test_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!s || s.student_id !== actor.real.id) throw new ActionError("notFound");
  return { admin, s };
}

/**
 * Advance the adaptive test: estimate θ from every scored answer, then stop (time, item cap,
 * precision, bank exhausted) or serve the next item. Deterministic per step, so a reload
 * after a disconnect serves the same item.
 */
export async function advance(admin: Admin, s: SessionRow): Promise<"continue" | "done"> {
  const student = await studentContext(admin, s.student_id);
  const blueprint = await loadBlueprint(
    admin,
    s.department_id,
    s.kind === "progress" ? "progress" : "placement",
  );
  if (!student || !blueprint) throw new ActionError("notAvailable");
  const [pool, answers] = await Promise.all([
    loadPool(admin, s.department_id, student),
    loadAnswers(admin, s.id),
  ]);
  const r = step({
    answers,
    pool,
    blueprint,
    prior: { mean: Number(s.theta0), sd: 1 },
    rng: stepRng(Number(s.rng_seed), answers.length),
    elapsedSec: elapsedSec(new Date(s.started_at), new Date()),
  });
  if (r.stop) {
    await finishReceptive(admin, s, r.estimate, r.stop, answers);
    return "done";
  }
  const { error } = await admin
    .from("test_sessions")
    .update({
      current_item_id: r.next.id,
      current_served_at: new Date().toISOString(),
      theta: r.estimate.theta,
      se: r.estimate.se,
      items_count: answers.length,
    })
    .eq("id", s.id)
    .eq("status", "in_progress");
  if (error) throw new ActionError("failed");
  return "continue";
}

/** Close a test whose time ran out while the learner was away (on the next visit). */
export async function expireIfLate(admin: Admin, s: SessionRow): Promise<boolean> {
  if (s.status !== "in_progress" || !s.deadline_at || new Date(s.deadline_at) > new Date())
    return false;
  await advance(admin, s);
  return true;
}
