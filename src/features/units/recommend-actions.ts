"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { assertCanWrite, ForbiddenError } from "@/lib/auth/can";
import { classTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const ids = z.array(z.guid()).max(200);
const input = z.object({
  unit: z.string().regex(/^[A-Z0-9-]{3,40}$/),
  class_id: z.guid(),
  whole: z.boolean(),
  groups: ids,
  students: ids,
  note: z.string().trim().max(300).optional(),
});

/**
 * A teacher recommends a unit to one student, some groups or the whole class. Needs the right
 * to set lessons for that class; the database function checks it again and reaches only
 * students of that class.
 */
export async function recommendUnit(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = input.parse({
      unit: form.get("unit"),
      class_id: form.get("class_id"),
      whole: form.get("whole") === "on",
      groups: form.getAll("group").map(String),
      students: form.getAll("student").map(String),
      note: form.get("note") ?? undefined,
    });
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    await assertCanWrite(actor, "lessons:assign", await classTarget(i.class_id));
    const targets = [
      ...(i.whole ? [{ type: "class", id: i.class_id }] : []),
      ...i.groups.map((id) => ({ type: "group", id })),
      ...i.students.map((id) => ({ type: "student", id })),
    ];
    if (targets.length === 0) throw new ActionError("messageNobody");
    const db = await createClient();
    const { error } = await db.rpc("recommend_unit", {
      p_class: i.class_id,
      p_unit: i.unit,
      p_targets: targets,
      p_note: i.note ?? "",
    });
    if (error) {
      if (error.code === "42501") throw new ForbiddenError("lessons:assign");
      throw new ActionError(error.message.includes("nobody") ? "messageNobody" : "failed");
    }
    revalidatePath("/", "layout");
    return undefined;
  }).then((r) => (r.ok ? { ok: true, message: "recommended" } : r));
}
