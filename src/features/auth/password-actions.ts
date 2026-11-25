"use server";

import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";
import { getActor } from "@/lib/auth/session";
import { isStudentEmail } from "@/lib/auth/student-identity";
import { allow, clientIp, LIMITS } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "./actions";

const localeSchema = z.enum(locales);
/** Long enough to resist guessing; 72 is the most the password hash reads. */
const passwordSchema = z.string().min(10).max(72);

/**
 * Staff sign-in with an email and a password they chose (Account → Password), for people who
 * sign in often and don't want an email each time. Students never use this form: their PIN
 * sign-in has its own page and limits.
 */
export async function passwordSignIn(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = localeSchema.catch("en").parse(form.get("locale"));
  const parsed = z
    .object({ email: z.email().trim().toLowerCase(), password: z.string().min(1).max(72) })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  const values = { email: String(form.get("email") ?? "") };
  if (!parsed.success || isStudentEmail(parsed.data.email))
    return { status: "error", message: "wrongPassword", values };
  const ip = await clientIp();
  if (
    !(await allow([
      { key: `pw:ip:${ip}`, ...LIMITS.passwordIp },
      { key: `pw:email:${parsed.data.email}`, ...LIMITS.passwordEmail },
    ]))
  )
    return { status: "error", message: "tooManyAttempts", values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error)
    return {
      status: "error",
      message: error.status === 429 ? "tooManyAttempts" : "wrongPassword",
      values,
    };
  const actor = await getActor();
  if (!actor) {
    await supabase.auth.signOut();
    return { status: "error", message: "wrongPassword", values };
  }
  redirect({ href: "/home", locale });
  return { status: "idle" };
}

/** A signed-in member of staff sets (or changes) their own password. */
export async function setPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const actor = await getActor();
  if (!actor || actor.viewAs || actor.real.kind !== "staff")
    return { status: "error", message: "notAllowed" };
  const password = passwordSchema.safeParse(form.get("password"));
  if (!password.success) return { status: "error", message: "passwordShort" };
  if (password.data !== form.get("confirm"))
    return { status: "error", message: "passwordMismatch" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { status: "error", message: "passwordNotSaved" };
  return { status: "sent" };
}
