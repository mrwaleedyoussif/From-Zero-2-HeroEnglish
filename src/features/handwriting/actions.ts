"use server";

import { z } from "zod";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isStyle } from "./types";
import { mayOpenHandwriting } from "./queries";

const input = z.object({
  step: z.string().regex(/^[LJWSP]-[a-z0-9]{1,12}$/),
  style: z.string().refine(isStyle),
  mode: z.enum(["trace", "write"]),
  score: z.number().int().min(0).max(100),
});

/**
 * Keep a learner's best mark for one step. The mark is measured on their device from what they
 * drew; it is practice feedback, never a grade. Nothing is saved while viewing as someone else.
 */
export async function saveHandwriting(raw: unknown): Promise<ActionResult<{ best: number }>> {
  return runAction(async () => {
    const i = input.parse(raw);
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    if (!isStyle(i.style) || !(await mayOpenHandwriting(actor, i.style)))
      throw new ActionError("forbidden");
    if (actor.viewAs) return { best: i.score };
    const db = await createClient();
    const key = { student_id: actor.effective.id, step_id: i.step, style: i.style, mode: i.mode };
    const { data: before } = await db
      .from("handwriting_progress")
      .select("best, tries")
      .match(key)
      .maybeSingle();
    const best = Math.max(i.score, before?.best ?? 0);
    const { error } = await db.from("handwriting_progress").upsert({
      ...key,
      school_id: actor.effective.school_id,
      best,
      tries: (before?.tries ?? 0) + 1,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new ActionError("failed");
    return { best };
  });
}
