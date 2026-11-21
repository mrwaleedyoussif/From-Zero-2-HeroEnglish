"use server";

import { z } from "zod";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { getActor } from "@/lib/auth/session";
import { recordTabSwitch, submitAnswer } from "./answer";
import { MAX_WRITING_CHARS, submitSpeaking, submitWriting } from "./productive";
import { startTest } from "./start";

async function actor() {
  const a = await getActor();
  if (!a) throw new ActionError("signedOut");
  return a;
}

const startSchema = z.object({
  department: z.string().regex(/^[A-Z0-9_]{2,20}$/),
  kind: z.enum(["placement", "progress"]),
});

export async function startTestAction(
  input: z.input<typeof startSchema>,
): Promise<ActionResult<{ sessionId: string }>> {
  return runAction(async () => {
    const { department, kind } = startSchema.parse(input);
    return { sessionId: await startTest(await actor(), department, kind) };
  });
}

const answerSchema = z.object({
  sessionId: z.guid(),
  itemId: z.guid(),
  answer: z.union([z.string().max(2000), z.array(z.string().max(5)).max(5)]),
});

export async function answerAction(
  input: z.input<typeof answerSchema>,
): Promise<ActionResult<{ done: boolean }>> {
  return runAction(async () => {
    const { sessionId, itemId, answer } = answerSchema.parse(input);
    return { done: (await submitAnswer(await actor(), sessionId, itemId, answer)) === "done" };
  });
}

export async function tabSwitchAction(sessionId: string): Promise<void> {
  const a = await getActor();
  if (a && z.guid().safeParse(sessionId).success)
    await recordTabSwitch(a, sessionId).catch(() => undefined);
}

const writingSchema = z.object({
  sessionId: z.guid(),
  itemId: z.guid(),
  text: z.string().max(MAX_WRITING_CHARS),
});

export async function writingAction(input: z.input<typeof writingSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const { sessionId, itemId, text } = writingSchema.parse(input);
    await submitWriting(await actor(), sessionId, itemId, text);
  });
}

/** Speaking: FormData with sessionId, itemId, durationMs and the recorded `audio` blob. */
export async function speakingAction(form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { sessionId, itemId, durationMs } = z
      .object({
        sessionId: z.guid(),
        itemId: z.guid(),
        durationMs: z.coerce.number().min(0).max(600_000),
      })
      .parse(Object.fromEntries([...form.entries()].filter(([k]) => k !== "audio")));
    const audio = form.get("audio");
    if (!(audio instanceof File)) throw new ActionError("invalid");
    await submitSpeaking(await actor(), sessionId, itemId, audio, durationMs);
  });
}
