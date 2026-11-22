import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { rewardTest } from "@/features/rewards/hooks";
import type { Tables } from "@/types/db";
import { cefrFor, scaledScore, skillEstimates } from "../engine/score";
import type { EngineAnswer, Estimate, StopReason } from "../engine/types";
import { loadCuts } from "./data";

type Admin = ReturnType<typeof createAdminClient>;
type SessionRow = Tables<"test_sessions">;

/**
 * Productive prompts for this level (SPEC §7): one writing and one speaking prompt nearest to
 * θ̂ (by difficulty), if the department has any. Deterministic, so it can be recomputed.
 */
export async function choosePrompts(admin: Admin, departmentId: string, theta: number) {
  const { data } = await admin
    .from("items")
    .select("id, item_type, skill_id, difficulty, b_initial, b_calibrated")
    .eq("department_id", departmentId)
    .eq("status", "active")
    .in("item_type", ["writing_prompt", "speaking_prompt"]);
  const best = new Map<
    string,
    { id: string; skill_id: string; kind: "writing" | "speaking"; dist: number }
  >();
  for (const i of data ?? []) {
    const b = Number(i.b_calibrated ?? i.b_initial);
    const kind = i.item_type === "writing_prompt" ? "writing" : "speaking";
    const current = best.get(kind);
    const dist = Math.abs(b - theta);
    if (!current || dist < current.dist || (dist === current.dist && i.id < current.id)) {
      best.set(kind, { id: i.id, skill_id: i.skill_id, kind, dist });
    }
  }
  return [...best.values()].sort((a, b) => a.kind.localeCompare(b.kind));
}

/** Score the adaptive part, store the result and history, then move to prompts or finish. */
export async function finishReceptive(
  admin: Admin,
  s: SessionRow,
  estimate: Estimate,
  stop: StopReason,
  answers: readonly EngineAnswer[],
) {
  const cuts = await loadCuts(admin, s.department_id);
  const cefr = cefrFor(estimate.theta, cuts);
  const skills = skillEstimates(answers, estimate.theta);
  const prompts = await choosePrompts(admin, s.department_id, estimate.theta);
  const now = new Date().toISOString();
  const status = prompts.length ? "productive" : "completed";

  await admin
    .from("test_sessions")
    .update({
      status,
      theta: estimate.theta,
      se: estimate.se,
      items_count: answers.length,
      cefr,
      scaled_score: scaledScore(estimate.theta),
      skill_estimates: skills.map((k) => ({ skill_id: k.skill, theta: k.theta, se: k.se, n: k.n })),
      stop_reason: stop,
      current_item_id: null,
      completed_at: status === "completed" ? now : null,
    })
    .eq("id", s.id);

  const source = s.kind === "progress" ? "progress" : "placement";
  const base = {
    student_id: s.student_id,
    school_id: s.school_id,
    department_id: s.department_id,
    session_id: s.id,
    source,
  };
  await admin.from("ability_estimates").insert([
    { ...base, skill_id: null, theta: estimate.theta, se: estimate.se, cefr },
    ...skills.map((k) => ({
      ...base,
      skill_id: k.skill,
      theta: k.theta,
      se: k.se,
      cefr: cefrFor(k.theta, cuts),
    })),
  ]);
  const { data: dept } = await admin
    .from("departments")
    .select("code")
    .eq("id", s.department_id)
    .single();
  await rewardTest(admin, {
    studentId: s.student_id,
    schoolId: s.school_id,
    sessionId: s.id,
    kind: source,
    departmentId: s.department_id,
    departmentCode: dept?.code ?? "",
    cefr,
  });
}
