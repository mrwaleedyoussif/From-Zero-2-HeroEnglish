"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { assertCan, assertCanWrite } from "@/lib/auth/can";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { type ImportOutcome, applyPlan } from "./apply";
import { type ImportPlan, planImport } from "./resolve";

const csvSchema = z.string().min(1).max(500_000);

async function prepare(form: FormData, write: boolean) {
  const csv = csvSchema.parse(form.get("csv"));
  const actor = await getActor();
  if (!actor) throw new ActionError("signedOut");
  const db = await createClient();
  const plan = await planImport(db, csv);
  // Every school touched by the file must allow users:import for the caller.
  const schoolIds = new Set(
    plan.rows.flatMap((r) => {
      const s = plan.ctx?.school.get(r.schoolCode);
      return s ? [s.id] : [];
    }),
  );
  for (const id of schoolIds) {
    const target = { school: id, grade: null, class: null, user: null };
    await (write ? assertCanWrite : assertCan)(actor, "users:import", target);
  }
  return { db, plan };
}

/** Step 1: validate and show what would happen. Nothing is written. */
export async function previewImport(
  _p: unknown,
  form: FormData,
): Promise<ActionResult<ImportPlan>> {
  return runAction(async () => {
    const { plan } = await prepare(form, false);
    return {
      rows: plan.rows.map(({ data: _d, ...r }) => r),
      fileErrors: plan.fileErrors,
      counts: plan.counts,
    };
  });
}

/** Step 2: re-validate the same file and create the "create" rows. */
export async function applyImport(
  _p: unknown,
  form: FormData,
): Promise<ActionResult<ImportOutcome[]>> {
  return runAction(async () => {
    const { db, plan } = await prepare(form, true);
    if (plan.fileErrors.length || !plan.ctx) throw new ActionError("invalid");
    const outcomes = await applyPlan(db, plan.ctx, plan.rows);
    await db.rpc("log_audit", {
      p_action: "users.import",
      p_target_table: "profiles",
      p_details: {
        created: outcomes.filter((o) => o.ok).length,
        failed: outcomes.filter((o) => !o.ok).length,
        skipped: plan.counts.exists,
        invalid: plan.counts.error,
      },
    });
    revalidatePath("/[locale]/owner/users", "page");
    return outcomes;
  });
}
