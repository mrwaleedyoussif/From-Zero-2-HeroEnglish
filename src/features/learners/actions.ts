"use server";

import { redirect } from "@/i18n/navigation";
import { isStudentEmail } from "@/lib/auth/student-identity";
import { serverEnv } from "@/lib/env";
import { allow, clientIp, LIMITS } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getMailer } from "@/lib/mail";
import { codeEmail } from "./code-email";
import { generalSchoolId, learnersOpen, randomUsername, signupsToday } from "./general";
import { codeSchema, emailSchema, localeSchema, welcomeSchema } from "./schema";

export interface LearnerState {
  step: "email" | "code";
  email?: string;
  /** Message key under Learner.errors. */
  error?: string;
}

async function hasProfile(admin: ReturnType<typeof createAdminClient>, email: string) {
  const { data } = await admin.from("profiles").select("id").eq("email", email).limit(1);
  return !!data?.length;
}

/**
 * Step 1: email a one-time code. A new address gets an account shell here (no profile and no
 * access yet): only someone who can read that inbox can go further. The reply is the same
 * whether or not the address already has an account.
 */
export async function requestCode(_p: LearnerState, form: FormData): Promise<LearnerState> {
  const locale = localeSchema.catch("en").parse(form.get("locale"));
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success || isStudentEmail(email.data)) return { step: "email", error: "email" };
  const env = serverEnv();
  if (!learnersOpen()) return { step: "email", error: "closed" };
  if (
    !(await allow([
      { key: `code:ip:${await clientIp()}`, ...LIMITS.linkIp },
      { key: `code:email:${email.data}`, ...LIMITS.codeEmail },
    ]))
  )
    return { step: "email", error: "tooMany" };

  const admin = createAdminClient();
  if (!(await hasProfile(admin, email.data))) {
    if ((await signupsToday(admin)) >= env.GENERAL_DAILY_SIGNUPS)
      return { step: "email", error: "full" };
    // Fails when the address already has an account, which is fine: the code is sent either way.
    await admin.auth.admin.createUser({
      email: email.data,
      email_confirm: true,
      user_metadata: { general: true },
    });
  }
  // The code comes from Supabase Auth (it checks it later); the email is ours, so it does not
  // depend on Supabase's own mail settings or templates.
  const { data: link } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: email.data,
  });
  const code = link.properties?.email_otp;
  if (!code) return { step: "email", error: "failed" };
  try {
    await (await getMailer()).send(codeEmail(email.data, code, locale));
    await admin.rpc("bump_usage", { p_kind: "email", p_n: 1 }); // Owner's budget meter
  } catch {
    return { step: "email", error: "failed" };
  }
  return { step: "code", email: email.data };
}

/** Step 2: the code proves the inbox is theirs. New learners go on to the welcome form. */
export async function verifyCode(_p: LearnerState, form: FormData): Promise<LearnerState> {
  const locale = localeSchema.catch("en").parse(form.get("locale"));
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { step: "email", error: "email" };
  const back: LearnerState = { step: "code", email: email.data };
  const code = codeSchema.safeParse(form.get("code"));
  if (!code.success) return { ...back, error: "wrongCode" };
  if (!(await allow([{ key: `code:try:${email.data}`, ...LIMITS.codeTry }])))
    return { ...back, error: "tooMany" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.data,
    token: code.data,
    type: "email",
  });
  if (error || !data.user) return { ...back, error: "wrongCode" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile && profile.status !== "active") {
    await supabase.auth.signOut();
    return { step: "email", error: "disabled" };
  }
  redirect({ href: profile ? "/home" : "/learner/welcome", locale });
  return back;
}

/** First visit after the code: create the learner (their own group, student role, consent). */
export async function completeProfile(
  _p: { error?: string },
  form: FormData,
): Promise<{ error?: string }> {
  const input = welcomeSchema.safeParse(Object.fromEntries(form.entries()));
  if (!input.success) return { error: "welcome" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user?.email || isStudentEmail(user.email)) return { error: "signedOut" };
  const env = serverEnv();
  if (!learnersOpen()) return { error: "closed" };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!existing) {
    if ((await signupsToday(admin)) >= env.GENERAL_DAILY_SIGNUPS) return { error: "full" };
    const [schoolId, { data: role }] = await Promise.all([
      generalSchoolId(admin),
      admin.from("roles").select("id").eq("key", "student").eq("status", "active").maybeSingle(),
    ]);
    if (!role) return { error: "failed" };
    const { error } = await admin.from("profiles").insert({
      id: user.id,
      school_id: schoolId,
      kind: "student",
      username: randomUsername(),
      full_name: input.data.full_name,
      email: user.email,
      locale: input.data.locale,
      consent: true,
      consent_at: new Date().toISOString(),
    });
    if (error) return { error: "failed" };
    const granted = await admin
      .from("user_roles")
      .insert({ user_id: user.id, role_id: role.id, scope_type: "self", scope_id: null });
    if (granted.error) {
      await admin.from("profiles").delete().eq("id", user.id); // no half-made learner
      return { error: "failed" };
    }
    await supabase.rpc("log_audit", {
      p_action: "learner.signup",
      p_target_table: "profiles",
      p_target_id: user.id,
      p_school: schoolId,
    });
  }
  redirect({ href: "/home", locale: input.data.locale });
  return {};
}
