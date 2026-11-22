"use server";

import { revalidatePath } from "next/cache";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite, canSomewhere } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { runTick } from "@/lib/scheduler/tick";
import { createClient } from "@/lib/supabase/server";

/** Per-user report opt-out (SPEC §12): weekly, monthly, and the digest email. */
export async function savePreferences(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    if (actor.viewAs) throw new ActionError("readOnly");
    if (!(await canSomewhere(actor, "reports:view"))) throw new ActionError("forbidden");
    const db = await createClient();
    check(
      await db.from("report_preferences").upsert({
        user_id: actor.real.id,
        weekly: form.get("weekly") === "on",
        monthly: form.get("monthly") === "on",
        email: form.get("email") === "on",
      }),
    );
    revalidatePath("/[locale]", "layout");
  });
}

/** Owner: run one scheduler tick now (the same work as the cron call). */
export async function runTickNow(_p: unknown, _form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    await assertCanWrite(actor, "integrations:manage", platformTarget);
    await runTick("manual");
    revalidatePath("/[locale]/owner/reports");
  });
}
