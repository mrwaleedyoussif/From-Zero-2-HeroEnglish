"use server";

import { revalidatePath } from "next/cache";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import type { Scope } from "@/lib/auth/engine";
import { classTarget, platformTarget, schoolTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { grantRole } from "./provision";
import { assignRoleSchema, idSchema, overrideSchema } from "./schema";

const form2obj = (f: FormData) => Object.fromEntries(f.entries());
const revalidate = () => revalidatePath("/[locale]/owner/users/[id]", "page");

async function actor() {
  const a = await getActor();
  if (!a) throw new ActionError("signedOut");
  return a;
}

async function scopeTargetOf(
  scope: Scope,
  userId: string,
  db: Awaited<ReturnType<typeof createClient>>,
) {
  switch (scope.type) {
    case "platform":
      return platformTarget;
    case "school":
      return schoolTarget(scope.id ?? "");
    case "class":
      return classTarget(scope.id ?? "");
    case "grade": {
      const { data } = await db
        .from("grades")
        .select("school_id")
        .eq("id", scope.id ?? "")
        .maybeSingle();
      return { school: data?.school_id ?? "unknown", grade: scope.id, class: null, user: null };
    }
    case "self":
      return { userId };
  }
}

/** Assign a role at a scope. The DB also refuses roles carrying permissions the caller lacks. */
export async function assignRole(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = assignRoleSchema.parse(form2obj(form));
    const db = await createClient();
    await assertCanWrite(
      await actor(),
      "roles:assign",
      await scopeTargetOf(input.scope, input.user_id, db),
    );
    const { data: p } = await db.from("profiles").select("kind").eq("id", input.user_id).single();
    await grantRole(db, input.user_id, input.role_id, input.scope, p?.kind === "staff");
    revalidate();
  });
}

export async function removeRole(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { id } = idSchema.parse(form2obj(form));
    const db = await createClient();
    const { data: row } = await db
      .from("user_roles")
      .select("user_id, scope_type, scope_id")
      .eq("id", id)
      .single();
    if (!row) throw new ActionError("forbidden");
    const scope = { type: row.scope_type, id: row.scope_id } as Scope;
    await assertCanWrite(
      await actor(),
      "roles:assign",
      await scopeTargetOf(scope, row.user_id, db),
    );
    const { data: deleted } = check(await db.from("user_roles").delete().eq("id", id).select("id"));
    if (!deleted?.length) throw new ActionError("forbidden"); // RLS refused silently
    if (row.scope_type === "class" && row.scope_id) {
      await db
        .from("teaching_assignments")
        .delete()
        .eq("teacher_id", row.user_id)
        .eq("class_id", row.scope_id);
    }
    revalidate();
  });
}

/** Grant or deny one permission for one user (SPEC §3 overrides). Takes effect immediately. */
export async function addOverride(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = overrideSchema.parse(form2obj(form));
    const db = await createClient();
    const a = await actor();
    await assertCanWrite(
      a,
      "permissions:grant",
      await scopeTargetOf(input.scope, input.user_id, db),
    );
    check(
      await db.from("user_permission_overrides").insert({
        user_id: input.user_id,
        permission_key: input.permission_key,
        effect: input.effect,
        scope_type: input.scope.type,
        scope_id: input.scope.id,
        expires_at: input.expires_at ? `${input.expires_at}T23:59:59Z` : null,
        reason: input.reason || null,
        created_by: a.real.id,
      }),
    );
    revalidate();
  });
}

export async function removeOverride(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { id } = idSchema.parse(form2obj(form));
    const db = await createClient();
    const { data: row } = await db
      .from("user_permission_overrides")
      .select("user_id, scope_type, scope_id")
      .eq("id", id)
      .single();
    if (!row) throw new ActionError("forbidden");
    const scope = { type: row.scope_type, id: row.scope_id } as Scope;
    await assertCanWrite(
      await actor(),
      "permissions:grant",
      await scopeTargetOf(scope, row.user_id, db),
    );
    const { data: deleted } = check(
      await db.from("user_permission_overrides").delete().eq("id", id).select("id"),
    );
    if (!deleted?.length) throw new ActionError("forbidden");
    revalidate();
  });
}
