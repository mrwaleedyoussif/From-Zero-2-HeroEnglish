"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget, schoolTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { isKnownKey } from "@/lib/registry";
import { createClient } from "@/lib/supabase/server";

const revalidate = () => revalidatePath("/[locale]/owner/plans", "page");

async function actor() {
  const a = await getActor();
  if (!a) throw new ActionError("signedOut");
  return a;
}

const entitlementKey = z.string().refine((k) => k === "*" || isKnownKey(k));

/** Replace a plan's entitlements from the editor (checkboxes "ent" + optional "limit:<key>" numbers). */
export async function savePlanEntitlements(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const planId = z.guid().parse(form.get("plan_id"));
    const keys = z.array(entitlementKey).parse(form.getAll("ent"));
    const rows = keys.map((key) => {
      const raw = form.get(`limit:${key}`);
      const limit = raw === null || raw === "" ? null : z.coerce.number().int().min(0).parse(raw);
      return { plan_id: planId, key, limit_value: limit };
    });
    await assertCanWrite(await actor(), "billing:manage", platformTarget);
    const db = await createClient();
    check(await db.from("plan_entitlements").delete().eq("plan_id", planId));
    if (rows.length) check(await db.from("plan_entitlements").insert(rows));
    revalidate();
  });
}

const subscriptionSchema = z.object({
  school_id: z.guid(),
  plan_id: z.guid(),
  free_until: z.preprocess((v) => (v === "" ? null : v), z.iso.date().nullable()),
});

/** Assign a plan (and "free until" date) to a school. */
export async function saveSubscription(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = subscriptionSchema.parse(Object.fromEntries(form.entries()));
    await assertCanWrite(await actor(), "billing:manage", schoolTarget(input.school_id));
    const db = await createClient();
    check(
      await db
        .from("subscriptions")
        .upsert({ ...input, status: "active", provider: "none" }, { onConflict: "school_id" }),
    );
    revalidate();
  });
}
