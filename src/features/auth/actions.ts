"use server";

import { cookies } from "next/headers";
import { redirect as externalRedirect } from "next/navigation";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { type Locale, locales } from "@/i18n/routing";
import { VIEW_AS_COOKIE, getActor } from "@/lib/auth/session";
import { studentEmail, studentLoginSchema } from "@/lib/auth/student-identity";
import { publicEnv } from "@/lib/env.public";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  status: "idle" | "sent" | "error";
  message?: string;
  /** Typed values to keep after an error (React resets forms after an action). Never the PIN. */
  values?: Record<string, string>;
};

const localeSchema = z.enum(locales);

function callbackUrl(locale: Locale): string {
  return `${publicEnv().NEXT_PUBLIC_APP_URL}/auth/callback?locale=${locale}`;
}

/** Staff magic link. Invite-only: never creates accounts. Same reply whether or not the email exists. */
export async function sendMagicLink(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ email: z.email().trim().toLowerCase(), locale: localeSchema })
    .safeParse({ email: form.get("email"), locale: form.get("locale") });
  const values = { email: String(form.get("email") ?? "") };
  if (!parsed.success) return { status: "error", message: "invalidEmail", values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: callbackUrl(parsed.data.locale) },
  });
  if (error && error.status === 429) return { status: "error", message: "tooManyAttempts", values };
  return { status: "sent" };
}

export async function signInWithGoogle(form: FormData): Promise<void> {
  const locale = localeSchema.catch("en").parse(form.get("locale"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(locale) },
  });
  if (error || !data.url) {
    redirect({ href: { pathname: "/login", query: { error: "google_unavailable" } }, locale });
    return;
  }
  // External URL (Google consent screen): plain redirect, not the locale-aware one.
  externalRedirect(data.url);
}

/** Student sign-in: school code + username + PIN → synthetic email + password. */
export async function studentSignIn(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = localeSchema.catch("en").parse(form.get("locale"));
  const parsed = studentLoginSchema.safeParse({
    schoolCode: form.get("schoolCode"),
    username: form.get("username"),
    pin: form.get("pin"),
  });
  const values = {
    schoolCode: String(form.get("schoolCode") ?? ""),
    username: String(form.get("username") ?? ""),
  };
  if (!parsed.success) return { status: "error", message: "wrongCredentials", values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: studentEmail(parsed.data.schoolCode, parsed.data.username),
    password: parsed.data.pin,
  });
  if (error) {
    return {
      status: "error",
      message: error.status === 429 ? "tooManyAttempts" : "wrongCredentials",
    };
  }
  const actor = await getActor();
  if (!actor) {
    await supabase.auth.signOut();
    return { status: "error", message: "accountDisabled", values };
  }
  redirect({ href: "/home", locale });
  return { status: "idle" };
}

export async function signOut(form: FormData): Promise<void> {
  const locale = localeSchema.catch("en").parse(form.get("locale"));
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(VIEW_AS_COOKIE);
  redirect({ href: "/login", locale });
}
