import "server-only";
import type { Actor } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { visibleOnly } from "@/lib/visibility/server";
import { loadBlueprint, studentContext } from "./runtime/data";
import { publicItem } from "./runtime/public-item";
import { decideStart, type StartDecision } from "./runtime/rules";
import { expireIfLate, ownSession } from "./runtime/session";
import { pendingPrompts } from "./runtime/productive";
import { startFacts } from "./runtime/start";

export interface DepartmentStatus {
  code: string;
  name_en: string;
  name_ar: string;
  last: { id: string; cefr: string | null; scaled: number | null; completedAt: string } | null;
  placement: StartDecision | null;
  progress: StartDecision | null;
}

/** The student's placement page: each visible department, last result, and whether they may start. */
export async function studentOverview(actor: Actor): Promise<DepartmentStatus[]> {
  const db = await createClient();
  const { data: depts } = await db
    .from("departments")
    .select("id, code, name_en, name_ar")
    .eq("status", "active")
    .order("code");
  const visible = await visibleOnly(actor, depts ?? [], (d) => `department.${d.code}`);
  const admin = createAdminClient();
  const student = await studentContext(admin, actor.effective.id);
  const out: DepartmentStatus[] = [];
  for (const d of visible) {
    const { data: last } = await db
      .from("test_sessions")
      .select("id, cefr, scaled_score, completed_at")
      .eq("student_id", actor.effective.id)
      .eq("department_id", d.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const decide = async (kind: "placement" | "progress") => {
      const bp = student ? await loadBlueprint(admin, d.id, kind) : null;
      if (!student || !bp) return null;
      const { facts } = await startFacts(admin, student.id, student.classIds, d.id, kind);
      return decideStart({ ...facts, cooldownDays: bp.cooldownDays });
    };
    out.push({
      code: d.code,
      name_en: d.name_en,
      name_ar: d.name_ar,
      last: last?.completed_at
        ? {
            id: last.id,
            cefr: last.cefr,
            scaled: last.scaled_score,
            completedAt: last.completed_at,
          }
        : null,
      placement: await decide("placement"),
      progress: await decide("progress"),
    });
  }
  return out;
}

/** What the test screen needs right now: the current item, or the pending prompts. */
export async function testView(actor: Actor, sessionId: string) {
  const { admin, s: first } = await ownSession(actor, sessionId);
  const s = (await expireIfLate(admin, first))
    ? ((await admin.from("test_sessions").select("*").eq("id", sessionId).single()).data ?? first)
    : first;
  const bp = await loadBlueprint(
    admin,
    s.department_id,
    s.kind === "progress" ? "progress" : "placement",
  );
  const base = {
    id: s.id,
    status: s.status,
    answered: s.items_count,
    maxItems: bp?.maxItems ?? 30,
    deadline: s.deadline_at,
  };
  if (s.status === "in_progress" && s.current_item_id) {
    return { ...base, item: await publicItem(admin, s.current_item_id), prompts: [] };
  }
  if (s.status === "productive") {
    const pending = await pendingPrompts(admin, s);
    const prompts = [];
    for (const p of pending) {
      const item = await publicItem(admin, p.id);
      if (item) prompts.push({ kind: p.kind, item });
    }
    return { ...base, item: null, prompts };
  }
  return { ...base, item: null, prompts: [] };
}

export type TestView = Awaited<ReturnType<typeof testView>>;
