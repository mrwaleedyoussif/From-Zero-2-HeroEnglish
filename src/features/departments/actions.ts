"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AUDIENCES, CATALOG, DEPARTMENT_STATES } from "./catalog";

const input = z.object({
  audience: z.enum(AUDIENCES),
  department: z.string().regex(/^[a-zA-Z0-9]{2,40}$/),
  state: z.enum(DEPARTMENT_STATES),
});

/**
 * Owner: open, close ("soon") or hide one department for one kind of learner. Written with the
 * Owner's own session, so the database checks the permission again and the audit log names them.
 */
export async function setDepartmentState(value: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const { audience, department, state } = input.parse(value);
    if (!CATALOG[audience].some((d) => d.key === department)) throw new ActionError("invalid");
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    await assertCanWrite(actor, "visibility:manage", platformTarget);
    const db = await createClient();
    check(
      await db
        .from("department_states")
        .upsert({ audience, department, state }, { onConflict: "audience,department" }),
    );
    revalidatePath("/", "layout");
  });
}
