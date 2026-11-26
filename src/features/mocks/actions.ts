"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mayOpenStrand } from "@/features/units/queries";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { getActor } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/db";
import { type Attempt, attemptById, latestAttempt, loadMock, settle } from "./attempts";
import { questionsIn } from "./schema";

async function mine(attemptId: string) {
  const id = z.guid().parse(attemptId);
  const actor = await getActor();
  if (!actor) throw new ActionError("signedOut");
  if (actor.viewAs) throw new ActionError("readOnly");
  const attempt = await attemptById(id);
  if (!attempt || attempt.student_id !== actor.effective.id) throw new ActionError("forbidden");
  const mock = await loadMock(attempt.exam_id);
  if (!mock) throw new ActionError("forbidden");
  return { mock, attempt: await settle(attempt, mock) };
}

/** Start an exam (or carry on with the sitting already started). */
export async function startMock(examId: string): Promise<ActionResult<{ attempt: string }>> {
  return runAction(async () => {
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    if (actor.viewAs) throw new ActionError("readOnly");
    if (!(await mayOpenStrand(actor, "SG"))) throw new ActionError("forbidden");
    const mock = await loadMock(z.string().parse(examId));
    if (!mock) throw new ActionError("forbidden");
    const last = await latestAttempt(actor.effective.id, mock);
    if (last && !last.finished_at) return { attempt: last.id };
    const { data, error } = await createAdminClient()
      .from("mock_attempts")
      .insert({
        student_id: actor.effective.id,
        school_id: actor.effective.school_id,
        exam_id: mock.id,
        section: mock.sections[0]?.n ?? 1,
      })
      .select("id")
      .single();
    if (error || !data) throw new ActionError("failed");
    revalidatePath("/[locale]/student/step/mocks", "layout");
    return { attempt: data.id };
  });
}

/** Keep one answer, only while its section is open. */
export async function answerMock(
  attemptId: string,
  questionId: string,
  choice: string,
): Promise<ActionResult<{ open: boolean }>> {
  return runAction(async () => {
    const letter = z.enum(["a", "b", "c", "d"]).parse(choice);
    const { mock, attempt } = await mine(attemptId);
    const section = mock.sections.find((s) => s.n === attempt.section);
    const inSection = !!section && questionsIn(section).some((q) => q.id === questionId);
    if (attempt.finished_at || !inSection) return { open: false };
    const { error } = await createAdminClient().rpc("mock_set_answer", {
      p_attempt: attempt.id,
      p_question: questionId,
      p_choice: letter,
    });
    if (error) throw new ActionError("failed");
    return { open: true };
  });
}

/** A recording is played once: the first ask says yes, every later one says no. */
export async function playMockTrack(
  attemptId: string,
  track: string,
): Promise<ActionResult<{ play: boolean }>> {
  return runAction(async () => {
    const { mock, attempt } = await mine(attemptId);
    const section = mock.sections.find((s) => s.n === attempt.section);
    const here = !!section?.groups.some((g) => g.track === track);
    if (attempt.finished_at || !here || attempt.played.includes(track)) return { play: false };
    const played = [...attempt.played, track];
    await createAdminClient()
      .from("mock_attempts")
      .update({ played: played as unknown as NonNullable<Json> })
      .eq("id", attempt.id);
    return { play: true };
  });
}

/** Leave the current section for the next one (or finish the exam); it can't be opened again. */
export async function leaveSection(
  attemptId: string,
): Promise<ActionResult<Pick<Attempt, "section" | "finished_at">>> {
  return runAction(async () => {
    const { mock, attempt } = await mine(attemptId);
    const next = attempt.finished_at ? attempt : await settle(attempt, mock, true);
    revalidatePath("/[locale]/student/step/mocks", "layout");
    return { section: next.section, finished_at: next.finished_at };
  });
}
