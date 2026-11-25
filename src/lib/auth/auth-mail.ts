import "server-only";
import { serverEnv } from "@/lib/env";
import { getMailer, type MailMessage } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sign-in emails for staff (invitation, sign-in link) sent by the app's own mail service.
 * Supabase's built-in sender only delivers to the project's own team and a few per hour, so
 * real schools need this. With the "console" mail provider (development, tests) the app has
 * no real mailer, and Supabase's sender stays in use.
 */
export function ownAuthMail(): boolean {
  return serverEnv().MAIL_PROVIDER !== "console";
}

const COPY = {
  invite: {
    en: [
      "You are invited to Zero-2-Hero English",
      "Your school account is ready. Press the button to open it. No password is needed.",
      "Open my account",
    ],
    ar: [
      "دعوة إلى Zero-2-Hero English",
      "حسابك المدرسي جاهز. اضغط الزر لفتحه. لا تحتاج إلى كلمة مرور.",
      "افتح حسابي",
    ],
  },
  magiclink: {
    en: [
      "Your sign-in link for Zero-2-Hero English",
      "Press the button to sign in. The link works once and expires soon.",
      "Sign in",
    ],
    ar: [
      "رابط الدخول إلى Zero-2-Hero English",
      "اضغط الزر لتسجيل الدخول. يعمل الرابط مرة واحدة وتنتهي صلاحيته قريبًا.",
      "تسجيل الدخول",
    ],
  },
} as const;
export type AuthMailKind = keyof typeof COPY;

const escape = (v: string) =>
  v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** The email itself, in both languages (the reader's first). Pure, so it is tested. */
export function authEmail(
  kind: AuthMailKind,
  to: string,
  link: string,
  locale: "en" | "ar",
  name?: string,
): MailMessage {
  const order = locale === "ar" ? (["ar", "en"] as const) : (["en", "ar"] as const);
  const hello = name ? `${name},` : "";
  const block = (lang: "en" | "ar") => {
    const [title, body, button] = COPY[kind][lang];
    return `<div dir="${lang === "ar" ? "rtl" : "ltr"}" style="margin:0 0 24px"><p style="font-size:18px;font-weight:bold;margin:0 0 8px">${title}</p><p style="margin:0 0 14px">${body}</p><a href="${escape(link)}" style="display:inline-block;background:#0e223d;color:#f6dc9c;font-weight:bold;text-decoration:none;border-radius:10px;padding:12px 22px">${button}</a></div>`;
  };
  const first = COPY[kind][order[0]];
  const second = COPY[kind][order[1]];
  return {
    to,
    subject: first[0],
    text: `${hello}\n${first[0]}\n${first[1]}\n${link}\n\n${second[0]}\n${second[1]}\n${link}\n`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:480px;margin:0 auto;padding:24px">${hello ? `<p style="margin:0 0 12px">${escape(hello)}</p>` : ""}${block(order[0])}${block(order[1])}</div>`,
  };
}

/** Send one sign-in email and count it against the daily email budget. Throws if it fails. */
export async function sendAuthMail(message: MailMessage): Promise<void> {
  await (await getMailer()).send(message);
  await createAdminClient().rpc("bump_usage", { p_kind: "email", p_n: 1 });
}
