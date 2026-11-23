"use server";

import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Erase a student (SPEC §15, PDPL right to deletion): Owner only, confirmed by typing the
 * username. Their uploads are removed from Drive, the account is deleted (every learner table
 * cascades), and the audit log keeps who erased whom — without the personal data itself.
 */
export async function eraseStudent(_p: unknown, form: FormData): Promise<ActionResult> {
  const input = z
    .object({ id: z.guid(), confirm: z.string().trim(), locale: z.enum(["en", "ar"]) })
    .safeParse(Object.fromEntries(form.entries()));
  const result = await runAction(async () => {
    if (!input.success) throw new ActionError("invalid");
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    await assertCanWrite(actor, "users:edit", platformTarget);
    const admin = createAdminClient();
    const { data: p } = await admin
      .from("profiles")
      .select("id, kind, username, school_id")
      .eq("id", input.data.id)
      .maybeSingle();
    if (!p || p.kind !== "student") throw new ActionError("notFound");
    if (input.data.confirm.toLowerCase() !== (p.username ?? "").toLowerCase())
      throw new ActionError("confirmMismatch");

    const { data: uploads } = await admin
      .from("productive_submissions")
      .select("drive_file_id")
      .eq("student_id", p.id)
      .not("drive_file_id", "is", null);
    if (uploads?.length) {
      const storage = await getStorage().catch(() => null);
      for (const u of uploads)
        if (storage && u.drive_file_id)
          await storage.remove(u.drive_file_id).catch(() => undefined);
    }
    // Audited as the signed-in Owner, before anything is deleted: no record, no erase.
    const audit = await (
      await createClient()
    ).rpc("log_audit", {
      p_action: "student.erase",
      p_target_table: "profiles",
      p_target_id: p.id,
      p_school: p.school_id ?? undefined,
      p_details: { uploads_removed: uploads?.length ?? 0 },
    });
    if (audit.error) throw new ActionError("failed");
    const { error } = await admin.auth.admin.deleteUser(p.id);
    if (error) throw new ActionError("failed");
  });
  if (result.ok && input.success) redirect({ href: "/owner/users", locale: input.data.locale });
  return result;
}
