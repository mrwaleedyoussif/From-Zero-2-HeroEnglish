"use server";

import { redirect } from "@/i18n/navigation";
import { isStudentEmail } from "@/lib/auth/student-identity";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generalSchoolId, learnersOpen, randomUsername, signupsToday } from "./general";
import { welcomeSchema } from "./schema";

/**
 * First visit after the code: create the learner in the general learners group, with the
 * student role and their consent. The Owner decides who gets in: a valid invitation code opens
 * the account at once; without one it stays switched off until the Owner approves the request.
 */
export async function completeProfile(
  _p: { error?: string },
  form: FormData,
): Promise<{ error?: string }> {
  const input = welcomeSchema.safeParse(Object.fromEntries(form.entries()));
  if (!input.success)
    return { error: input.error.issues.some((i) => i.path[0] === "invite") ? "invite" : "welcome" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user?.email || isStudentEmail(user.email)) return { error: "signedOut" };
  if (!learnersOpen()) return { error: "closed" };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();
  let open = existing?.status === "active";
  if (!existing) {
    if ((await signupsToday(admin)) >= serverEnv().GENERAL_DAILY_SIGNUPS) return { error: "full" };
    const [schoolId, { data: role }] = await Promise.all([
      generalSchoolId(admin),
      admin.from("roles").select("id").eq("key", "student").eq("status", "active").maybeSingle(),
    ]);
    if (!role) return { error: "failed" };
    let inviteId: string | null = null;
    if (input.data.invite) {
      const { data } = await admin.rpc("redeem_learner_invite", { p_code: input.data.invite });
      if (!data) return { error: "invite" };
      inviteId = data;
    }
    open = !!inviteId;
    const now = new Date().toISOString();
    const made = await admin.from("profiles").insert({
      id: user.id,
      school_id: schoolId,
      kind: "student",
      username: randomUsername(),
      full_name: input.data.full_name,
      email: user.email,
      locale: input.data.locale,
      consent: true,
      consent_at: now,
      status: open ? "active" : "disabled",
    });
    const granted = made.error
      ? made
      : await admin
          .from("user_roles")
          .insert({ user_id: user.id, role_id: role.id, scope_type: "self", scope_id: null });
    const asked = granted.error
      ? granted
      : await admin.from("learner_requests").insert({
          user_id: user.id,
          invite_id: inviteId,
          status: open ? "approved" : "pending",
          decided_at: open ? now : null,
        });
    if (asked.error) {
      await admin.from("profiles").delete().eq("id", user.id); // no half-made learner
      return { error: "failed" };
    }
    await supabase.rpc("log_audit", {
      p_action: open ? "learner.join" : "learner.request",
      p_target_table: "profiles",
      p_target_id: user.id,
      p_school: schoolId,
      p_details: { invite_id: inviteId },
    });
  }
  if (!open) await supabase.auth.signOut();
  redirect({ href: open ? "/home" : "/learner/pending", locale: input.data.locale });
  return {};
}
