"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { classTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const target = z
  .string()
  .regex(/^(student|group|team|class):[0-9a-f-]{36}$/i)
  .transform((v) => {
    const [type, id] = v.split(":") as [string, string];
    return { type, id };
  });

const assignInput = z.object({
  class_id: z.guid(),
  lesson_ids: z.array(z.guid()).min(1).max(10),
  targets: z.array(target).min(1).max(60),
  due_on: z.iso.date().optional(),
  note: z.string().trim().max(500).optional(),
  required: z.boolean(),
});

/**
 * Assign lessons to students / groups / teams / the class (SPEC §9). The DB function re-checks
 * lessons:assign on the class, expands targets to students and notifies each of them.
 */
export async function assignLessons(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = assignInput.parse({
      class_id: form.get("class_id"),
      lesson_ids: form.getAll("lesson_id"),
      targets: form.getAll("target"),
      due_on: form.get("due_on") || undefined,
      note: form.get("note") || undefined,
      required: form.get("required") !== "optional",
    });
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    await assertCanWrite(actor, "lessons:assign", await classTarget(i.class_id));
    const due = i.due_on ? new Date(`${i.due_on}T23:59:59Z`) : null;
    if (due && due < new Date()) throw new ActionError("invalid");
    const db = await createClient();
    for (const lesson of i.lesson_ids)
      check(
        await db.rpc("assign_lesson", {
          p_class: i.class_id,
          p_lesson: lesson,
          p_targets: i.targets,
          p_due: due?.toISOString() ?? (null as unknown as string),
          p_note: i.note ?? "",
          p_required: i.required,
        }),
      );
    revalidatePath("/[locale]/teacher", "layout");
    return undefined;
  });
}

export async function deleteAssignment(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = z
      .object({ class_id: z.guid(), id: z.guid() })
      .parse(Object.fromEntries(form.entries()));
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    await assertCanWrite(actor, "lessons:assign", await classTarget(i.class_id));
    const db = await createClient();
    check(await db.from("assignments").delete().eq("id", i.id).eq("class_id", i.class_id));
    revalidatePath("/[locale]/teacher", "layout");
  });
}

/** Teacher annotation on a learner profile (SPEC §8). */
export async function addLearnerNote(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = z
      .object({ student_id: z.guid(), body: z.string().trim().min(1).max(1000) })
      .parse(Object.fromEntries(form.entries()));
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    await assertCanWrite(actor, "students:edit", { userId: i.student_id });
    const db = await createClient();
    const { data: p } = await db
      .from("profiles")
      .select("school_id")
      .eq("id", i.student_id)
      .single();
    if (!p?.school_id) throw new ActionError("notFound");
    check(
      await db
        .from("learner_notes")
        .insert({ ...i, school_id: p.school_id, author_id: actor.real.id }),
    );
    revalidatePath("/[locale]/teacher", "layout");
  });
}
