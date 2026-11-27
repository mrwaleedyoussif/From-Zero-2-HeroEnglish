"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { can, canSomewhere, ForbiddenError, ReadOnlyError } from "@/lib/auth/can";
import { schoolTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const ids = z.array(z.guid()).max(200);
const input = z.object({
  audience: z.enum(["students", "staff"]),
  body: z.string().trim().min(1).max(2000),
  classes: ids,
  groups: ids,
  students: ids,
  teachers: ids,
  allTeachers: z.boolean(),
});

/**
 * Send an in-app message. Staff write to students (one, several, a group or a class) or, for
 * leaders and coaches, to teachers. Students hold no sending permission. The database function
 * checks every target again and leaves out anyone outside the sender's rights.
 */
export async function sendMessage(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const all = (k: string) => form.getAll(k).map(String);
    const i = input.parse({
      audience: form.get("audience"),
      body: form.get("body"),
      classes: all("class"),
      groups: all("group"),
      students: all("student"),
      teachers: all("teacher"),
      allTeachers: form.get("all_teachers") === "on",
    });
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    if (actor.viewAs) throw new ReadOnlyError();
    const allowed =
      i.audience === "students"
        ? await canSomewhere(actor, "messages:send")
        : !!actor.effective.school_id &&
          (await can(actor, "messages:send_staff", schoolTarget(actor.effective.school_id)));
    if (!allowed) throw new ForbiddenError("messages");
    const targets =
      i.audience === "students"
        ? [
            ...i.classes.map((id) => ({ type: "class", id })),
            ...i.groups.map((id) => ({ type: "group", id })),
            ...i.students.map((id) => ({ type: "student", id })),
          ]
        : i.allTeachers
          ? [{ type: "teachers" }]
          : i.teachers.map((id) => ({ type: "teacher", id }));
    if (targets.length === 0) throw new ActionError("messageNobody");
    const db = await createClient();
    const { error } = await db.rpc("send_message", {
      p_audience: i.audience,
      p_targets: targets,
      p_body: i.body,
    });
    if (error) {
      if (error.code === "54000") throw new ActionError("messageTooMany");
      if (error.code === "42501") throw new ForbiddenError("messages");
      throw new ActionError(error.message.includes("nobody") ? "messageNobody" : "failed");
    }
    revalidatePath("/", "layout");
    return undefined;
  }).then((r) => (r.ok ? { ok: true, message: "messageSent" } : r));
}
