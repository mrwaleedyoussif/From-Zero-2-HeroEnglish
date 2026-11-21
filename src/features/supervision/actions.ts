"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { schoolTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

async function authorize(schoolId: string) {
  const actor = await getActor();
  if (!actor) throw new ActionError("signedOut");
  await assertCanWrite(actor, "supervision:manage", schoolTarget(schoolId));
  return createClient();
}

const revalidate = () => revalidatePath("/[locale]/owner/supervision", "page");

const linkSchema = z
  .object({
    school_id: z.guid(),
    supervisor_id: z.guid(),
    supervisee_id: z.guid(),
    kind: z.enum(["line", "academic", "coaching"]),
  })
  .refine((l) => l.supervisor_id !== l.supervisee_id, { path: ["supervisee_id"] });

export async function addLink(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = linkSchema.parse(Object.fromEntries(form.entries()));
    const db = await authorize(input.school_id);
    check(await db.from("supervision_links").insert({ ...input, source: "manual" }));
    revalidate();
  });
}

/** Links are ended, not deleted, so history stays available for reports. */
export async function endLink(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { id, school_id } = z
      .object({ id: z.guid(), school_id: z.guid() })
      .parse(Object.fromEntries(form.entries()));
    const db = await authorize(school_id);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = check(
      await db
        .from("supervision_links")
        .update({ active_to: today })
        .eq("id", id)
        .eq("school_id", school_id)
        .select("id"),
    );
    if (!data?.length) throw new ActionError("forbidden");
    revalidate();
  });
}

export async function applyDefaults(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const schoolId = z.guid().parse(form.get("school_id"));
    const db = await authorize(schoolId);
    check(await db.rpc("apply_supervision_defaults", { p_school: schoolId }));
    revalidate();
  });
}
