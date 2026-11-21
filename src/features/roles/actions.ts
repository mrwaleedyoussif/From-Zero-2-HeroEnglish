"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { scopeTypes } from "@/lib/auth/engine";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

async function authorize() {
  const actor = await getActor();
  if (!actor) throw new ActionError("signedOut");
  await assertCanWrite(actor, "roles:manage", platformTarget);
  return createClient();
}

/** The platform-wide system role (Owner) is locked so nobody can remove their own way back in. */
async function assertEditable(db: Awaited<ReturnType<typeof createClient>>, roleId: string) {
  const { data } = await db
    .from("roles")
    .select("is_system, default_scope_type")
    .eq("id", roleId)
    .single();
  if (!data) throw new ActionError("forbidden");
  if (data.is_system && data.default_scope_type === "platform") throw new ActionError("roleLocked");
}

const toggleSchema = z.object({
  role_id: z.guid(),
  permission_key: z.string().regex(/^[a-z_]+:[a-z_:]+$/),
  granted: z.boolean(),
});

/** One checkbox in the matrix. Effective immediately for everyone holding the role. */
export async function setRolePermission(
  input: z.input<typeof toggleSchema>,
): Promise<ActionResult> {
  return runAction(async () => {
    const { role_id, permission_key, granted } = toggleSchema.parse(input);
    const db = await authorize();
    await assertEditable(db, role_id);
    if (granted) {
      check(
        await db
          .from("role_permissions")
          .upsert({ role_id, permission_key }, { onConflict: "role_id,permission_key" }),
      );
    } else {
      check(
        await db
          .from("role_permissions")
          .delete()
          .eq("role_id", role_id)
          .eq("permission_key", permission_key),
      );
    }
    revalidatePath("/[locale]/owner/roles", "page");
  });
}

const roleSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_]{1,40}$/),
  name_en: z.string().trim().min(2).max(60),
  name_ar: z.string().trim().min(2).max(60),
  default_scope_type: z.enum(scopeTypes),
});

export async function createRole(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = roleSchema.parse(Object.fromEntries(form.entries()));
    const db = await authorize();
    check(await db.from("roles").insert({ ...input, is_system: false }));
    revalidatePath("/[locale]/owner/roles", "page");
  });
}

export async function setRoleStatus(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const roleId = z.guid().parse(form.get("role_id"));
    const status = form.get("status") === "disabled" ? "disabled" : "active";
    const db = await authorize();
    await assertEditable(db, roleId);
    check(await db.from("roles").update({ status }).eq("id", roleId));
    revalidatePath("/[locale]/owner/roles", "page");
  });
}
