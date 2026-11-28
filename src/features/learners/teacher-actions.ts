"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

async function owner() {
  const actor = await getActor();
  if (!actor) throw new ActionError("signedOut");
  await assertCanWrite(actor, "users:edit", platformTarget);
}
const done = () => revalidatePath("/[locale]/owner/learners", "page");

/**
 * Give one or more general learners to a teacher. Until the Owner does this, nobody but the
 * Owner sees a general learner; afterwards that teacher (and no other) has them as a class.
 */
export async function assignLearners(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = z
      .object({ teacher: z.guid(), learners: z.array(z.guid()).min(1).max(200) })
      .parse({ teacher: form.get("teacher"), learners: form.getAll("learner").map(String) });
    await owner();
    const db = await createClient();
    for (const learner of i.learners)
      check(await db.rpc("assign_learner_teacher", { p_learner: learner, p_teacher: i.teacher }));
    await db.rpc("log_audit", {
      p_action: "learner.assign_teacher",
      p_target_table: "profiles",
      p_target_id: i.teacher,
      p_details: { learners: i.learners },
    });
    done();
  });
}

/** Take a learner back from a teacher: that teacher no longer sees them. */
export async function unassignLearner(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = z
      .object({ teacher: z.guid(), learner: z.guid() })
      .parse({ teacher: form.get("teacher"), learner: form.get("learner") });
    await owner();
    const db = await createClient();
    check(await db.rpc("unassign_learner_teacher", { p_learner: i.learner, p_teacher: i.teacher }));
    await db.rpc("log_audit", {
      p_action: "learner.unassign_teacher",
      p_target_table: "profiles",
      p_target_id: i.learner,
      p_details: { teacher: i.teacher },
    });
    done();
  });
}
