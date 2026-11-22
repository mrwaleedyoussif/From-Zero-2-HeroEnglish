import "server-only";
import { cefrIndex } from "@/features/learning/recommend/engine";
import type { createAdminClient } from "@/lib/supabase/admin";
import { type AwardOutcome, award } from "./award";
import { cefrMilestone } from "./award-extras";

type Admin = ReturnType<typeof createAdminClient>;

/** Merge outcomes of several awards into one (for a single celebration). */
function merge(outcomes: AwardOutcome[]): AwardOutcome {
  return outcomes.reduce(
    (a, o) => ({
      xp: a.xp + o.xp,
      coins: a.coins + o.coins,
      badges: [...a.badges, ...o.badges],
      levels: [...a.levels, ...o.levels],
      streak: o.streak ?? a.streak,
    }),
    { xp: 0, coins: 0, badges: [], levels: [], streak: null },
  );
}

/**
 * Rewards for finishing a lesson: the lesson (once per lesson per day), the practice accuracy
 * bonus, and on-time assignments. Anti-gaming (time, accuracy, caps) is in the rules.
 */
export async function rewardLesson(
  admin: Admin,
  studentId: string,
  lesson: {
    id: string;
    cefr: string | null;
    format: string;
    skills: { code: string } | null;
    departments: { code: string } | null;
  },
  seconds: number,
  score: number | null,
  onTimeAssignments: readonly string[],
): Promise<AwardOutcome> {
  const day = new Date().toISOString().slice(0, 10);
  const meta = {
    lesson: lesson.id,
    skill: lesson.skills?.code ?? null,
    cefr: lesson.cefr,
    format: lesson.format,
    department: lesson.departments?.code ?? null,
  };
  const out: AwardOutcome[] = [
    await award(admin, {
      studentId,
      type: "lesson_completed",
      sourceKey: `${lesson.id}:${day}`,
      seconds,
      level: cefrIndex(lesson.cefr),
      accuracy: score,
      meta,
    }),
  ];
  if (score !== null)
    out.push(
      await award(admin, {
        studentId,
        type: "practice_accuracy",
        sourceKey: `${lesson.id}:${day}`,
        accuracy: score,
        meta,
      }),
    );
  for (const id of onTimeAssignments)
    out.push(await award(admin, { studentId, type: "assignment_on_time", sourceKey: id, meta }));
  return merge(out);
}

/** Rewards for finishing a placement test or progress check, and a CEFR milestone certificate. */
export async function rewardTest(
  admin: Admin,
  t: {
    studentId: string;
    schoolId: string;
    sessionId: string;
    kind: "placement" | "progress";
    departmentId: string;
    departmentCode: string;
    cefr: string | null;
  },
): Promise<AwardOutcome> {
  const outcome = await award(admin, {
    studentId: t.studentId,
    type: t.kind === "placement" ? "placement_completed" : "progress_completed",
    sourceKey: t.sessionId,
    meta: { cefr: t.cefr, department: t.departmentCode },
  });
  if (t.cefr) await cefrMilestone(admin, t.studentId, t.schoolId, t.departmentId, t.cefr);
  return outcome;
}
