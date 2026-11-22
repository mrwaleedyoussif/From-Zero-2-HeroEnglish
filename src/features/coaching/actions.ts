"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const optDate = z.preprocess((v) => (v === "" ? undefined : v), z.iso.date().optional());

/** A coaching log entry (observation / walkthrough / meeting) with rubric scores 1–4 (SPEC §11). */
export async function createLog(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const entries = Object.fromEntries(form.entries());
    const i = z
      .object({
        teacher_id: z.guid(),
        class_id: z.preprocess((v) => (v === "" ? undefined : v), z.guid().optional()),
        kind: z.enum(["observation", "walkthrough", "meeting"]),
        observed_on: z.iso.date(),
        rubric_id: z.preprocess((v) => (v === "" ? undefined : v), z.guid().optional()),
        notes: z.string().trim().max(4000).optional(),
        agreed_actions: z.string().trim().max(2000).optional(),
        follow_up_on: optDate,
      })
      .parse(entries);
    const scores = Object.fromEntries(
      Object.entries(entries)
        .filter(([k, v]) => k.startsWith("s_") && v !== "")
        .map(([k, v]) => [k.slice(2), z.coerce.number().int().min(1).max(4).parse(v)]),
    );
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    await assertCanWrite(actor, "coaching:log", { userId: i.teacher_id });
    const db = await createClient();
    check(
      await db.from("coaching_logs").insert({
        ...i,
        class_id: i.class_id ?? null,
        rubric_id: i.rubric_id ?? null,
        notes: i.notes || null,
        agreed_actions: i.agreed_actions || null,
        follow_up_on: i.follow_up_on ?? null,
        scores,
        coach_id: actor.real.id,
        school_id: actor.real.school_id ?? "",
      }),
    );
    revalidatePath("/[locale]/coach", "layout");
  });
}

export async function closeFollowUp(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { id } = z.object({ id: z.guid() }).parse(Object.fromEntries(form.entries()));
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    await assertCanWrite(actor, "coaching:log", { userId: actor.real.id });
    const db = await createClient();
    const { data } = check(
      await db.from("coaching_logs").update({ status: "done" }).eq("id", id).select("id"),
    );
    if (!data?.length) throw new ActionError("notFound");
    revalidatePath("/[locale]/coach", "layout");
  });
}
