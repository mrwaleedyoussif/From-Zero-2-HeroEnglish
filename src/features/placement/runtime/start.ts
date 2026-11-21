import "server-only";
import { ActionError } from "@/lib/action-result";
import { assertCan, ReadOnlyError } from "@/lib/auth/can";
import type { Actor } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isVisible } from "@/lib/visibility/server";
import { loadBlueprint, priorTheta, studentContext } from "./data";
import { decideStart } from "./rules";
import { advance } from "./session";

export type TestKind = "placement" | "progress";

/** Facts for the start decision; shared by the start action and the student's placement page. */
export async function startFacts(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  classIds: string[],
  departmentId: string,
  kind: TestKind,
) {
  const now = new Date();
  const [open, last, retakes, windows] = await Promise.all([
    admin
      .from("test_sessions")
      .select("id")
      .eq("student_id", studentId)
      .eq("department_id", departmentId)
      .eq("kind", kind)
      .in("status", ["in_progress", "productive"])
      .maybeSingle(),
    admin
      .from("test_sessions")
      .select("completed_at")
      .eq("student_id", studentId)
      .eq("department_id", departmentId)
      .eq("kind", "placement")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("placement_retakes")
      .select("id")
      .eq("student_id", studentId)
      .eq("department_id", departmentId)
      .is("used_at", null)
      .order("created_at")
      .limit(1),
    classIds.length
      ? admin
          .from("placement_windows")
          .select("id")
          .in("class_id", classIds)
          .eq("department_id", departmentId)
          .lte("opens_at", now.toISOString())
          .gt("closes_at", now.toISOString())
          .order("closes_at")
          .limit(1)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  const windowId = windows.data?.[0]?.id ?? null;
  const done = windowId
    ? await admin
        .from("test_sessions")
        .select("id")
        .eq("student_id", studentId)
        .eq("window_id", windowId)
        .eq("status", "completed")
        .limit(1)
    : { data: [] };
  return {
    facts: {
      kind,
      now,
      openSessionId: open.data?.id ?? null,
      lastCompletedAt: last.data?.completed_at ? new Date(last.data.completed_at) : null,
      hasUnusedRetake: (retakes.data ?? []).length > 0,
      openWindowId: windowId,
      doneInWindow: (done.data ?? []).length > 0,
    },
    retakeId: retakes.data?.[0]?.id ?? null,
  };
}

/** Start (or resume) a placement test / progress check for the signed-in student. */
export async function startTest(
  actor: Actor,
  departmentCode: string,
  kind: TestKind,
): Promise<string> {
  if (actor.viewAs) throw new ReadOnlyError();
  await assertCan(actor, "placement:take", { userId: actor.real.id });
  const admin = createAdminClient();
  const { data: dept } = await admin
    .from("departments")
    .select("id, code, status")
    .eq("code", departmentCode)
    .maybeSingle();
  if (!dept || dept.status !== "active" || !(await isVisible(actor, `department.${dept.code}`))) {
    throw new ActionError("notAvailable");
  }
  const student = await studentContext(admin, actor.real.id);
  const blueprint = await loadBlueprint(admin, dept.id, kind);
  if (!student || !blueprint) throw new ActionError("notAvailable");

  const { facts, retakeId } = await startFacts(admin, student.id, student.classIds, dept.id, kind);
  const decision = decideStart({ ...facts, cooldownDays: blueprint.cooldownDays });
  if (!decision.ok) throw new ActionError(decision.reason);
  if (decision.resume) return decision.resume;

  if (kind === "placement" && facts.lastCompletedAt && retakeId) {
    await admin
      .from("placement_retakes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", retakeId);
  }
  const now = Date.now();
  const { data: s, error } = await admin
    .from("test_sessions")
    .insert({
      student_id: student.id,
      school_id: student.schoolId,
      department_id: dept.id,
      kind,
      theta0: await priorTheta(admin, student.id, dept.id, student.band),
      rng_seed: Math.floor(Math.random() * 2 ** 31),
      deadline_at: blueprint.timeLimitSec
        ? new Date(now + blueprint.timeLimitSec * 1000).toISOString()
        : null,
      window_id: decision.windowId,
    })
    .select("*")
    .single();
  if (error || !s) throw new ActionError(error?.code === "23505" ? "alreadyStarted" : "failed");
  await advance(admin, s);
  return s.id;
}
