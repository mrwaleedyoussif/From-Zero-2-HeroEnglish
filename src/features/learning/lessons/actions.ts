"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { type Actor, getActor } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { scorePractice } from "./practice";
import { openableLesson } from "./queries";
import { clearRecommendations } from "./recommended";

/** The learner, allowed to learn, on a lesson they may open. Writes use the service role after. */
async function learnerOn(lessonId: string) {
  const actor = await getActor();
  if (!actor) throw new ActionError("signedOut");
  await assertCanWrite(actor, "learning:self", { userId: actor.real.id });
  const lesson = await openableLesson(actor, z.guid().parse(lessonId));
  if (!lesson) throw new ActionError("notFound");
  const admin = createAdminClient();
  const { data: me } = await admin
    .from("profiles")
    .select("school_id")
    .eq("id", actor.real.id)
    .single();
  if (!me?.school_id) throw new ActionError("notFound");
  return { actor, lesson, admin, schoolId: me.school_id };
}

/** Open assignments of this lesson for the learner. */
async function openAssignments(
  admin: ReturnType<typeof createAdminClient>,
  a: Actor,
  lessonId: string,
) {
  const { data } = await admin
    .from("assignment_progress")
    .select("assignment_id, status, time_spent_sec, assignments!inner(lesson_id)")
    .eq("student_id", a.real.id)
    .eq("assignments.lesson_id", lessonId)
    .neq("status", "done");
  return data ?? [];
}

export async function openLesson(lessonId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { actor, lesson, admin, schoolId } = await learnerOn(lessonId);
    const now = new Date().toISOString();
    const { data: existing } = await admin
      .from("lesson_progress")
      .select("status")
      .eq("student_id", actor.real.id)
      .eq("lesson_id", lesson.id)
      .maybeSingle();
    await admin.from("lesson_progress").upsert({
      student_id: actor.real.id,
      lesson_id: lesson.id,
      school_id: schoolId,
      status: existing?.status ?? "in_progress",
      last_opened_at: now,
    });
    for (const p of await openAssignments(admin, actor, lesson.id))
      if (p.status === "not_started")
        await admin
          .from("assignment_progress")
          .update({ status: "in_progress", started_at: now })
          .eq("assignment_id", p.assignment_id)
          .eq("student_id", actor.real.id);
    revalidatePath("/[locale]/teacher", "layout");
  });
}

const completeInput = z.object({
  answers: z
    .array(
      z.object({
        itemId: z.guid(),
        answer: z.union([z.string().max(500), z.array(z.string().max(20)).max(10)]),
      }),
    )
    .max(10),
  seconds: z
    .number()
    .int()
    .min(0)
    .max(4 * 3600),
});

/** Finish a lesson: score the practice check, then update the lesson and any assignments. */
export async function completeLesson(
  lessonId: string,
  input: unknown,
): Promise<
  ActionResult<{ score: number | null; results: { itemId: string; correct: boolean }[] }>
> {
  return runAction(async () => {
    const { actor, lesson, admin, schoolId } = await learnerOn(lessonId);
    const { answers, seconds } = completeInput.parse(input);
    const { score, results } = await scorePractice(admin, lesson, answers);
    const now = new Date().toISOString();
    const { data: prev } = await admin
      .from("lesson_progress")
      .select("best_score, attempts, time_spent_sec")
      .eq("student_id", actor.real.id)
      .eq("lesson_id", lesson.id)
      .maybeSingle();
    await admin.from("lesson_progress").upsert({
      student_id: actor.real.id,
      lesson_id: lesson.id,
      school_id: schoolId,
      status: "done",
      best_score:
        score === null ? (prev?.best_score ?? null) : Math.max(score, prev?.best_score ?? 0),
      attempts: (prev?.attempts ?? 0) + 1,
      time_spent_sec: (prev?.time_spent_sec ?? 0) + seconds,
      last_opened_at: now,
      completed_at: now,
    });
    for (const p of await openAssignments(admin, actor, lesson.id))
      await admin
        .from("assignment_progress")
        .update({
          status: "done",
          score,
          time_spent_sec: p.time_spent_sec + seconds,
          completed_at: now,
        })
        .eq("assignment_id", p.assignment_id)
        .eq("student_id", actor.real.id);
    await clearRecommendations(actor.real.id);
    revalidatePath("/[locale]/student", "layout");
    revalidatePath("/[locale]/teacher", "layout");
    return { score, results };
  });
}
