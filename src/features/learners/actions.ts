"use server";

import { redirect } from "@/i18n/navigation";
import { isStudentEmail } from "@/lib/auth/student-identity";
import { serverEnv } from "@/lib/env";
import { allow, clientIp, LIMITS } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getMailer } from "@/lib/mail";
import { codeEmail } from "./code-email";
import { learnersOpen, signupsToday } from "./general";
import { codeSchema, emailSchema, localeSchema } from "./schema";

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
  // Read with the service role: a learner who is not approved yet can't see their own row.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("status")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile && profile.status !== "active") {
    // Not approved yet, or switched off by the Owner: either way, no session.
    const { data: request } = await admin
      .from("learner_requests")
      .select("status")
      .eq("user_id", data.user.id)
      .maybeSingle();
    await supabase.auth.signOut();
    return { step: "email", error: request?.status === "pending" ? "pending" : "disabled" };
  }
  redirect({ href: profile ? "/home" : "/learner/welcome", locale });
  return back;
}
