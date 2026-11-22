import "server-only";
import { OAuth2Client } from "google-auth-library";
import { serverEnv } from "@/lib/env";
import { loadGoogleToken } from "@/lib/storage/secret";
import { buildMime, toBase64Url } from "./mime";

/**
 * Mail adapter (SPEC §12, rule 5): the only way the app sends email. Providers:
 *  - console: logs the message (development, tests, dry runs)
 *  - resend:  Resend HTTP API (free tier 100/day; the scheduler stops at EMAIL_DAILY_BUDGET)
 *  - gmail:   the Owner's Gmail via the Google OAuth connection (needs the gmail.send scope)
 * The daily budget guard lives in the scheduler, which counts `email_log`.
 */
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailAdapter {
  provider: "console" | "resend" | "gmail";
  send(m: MailMessage): Promise<void>;
}

export class MailError extends Error {}

function consoleMailer(): MailAdapter {
  return {
    provider: "console",
    async send(m) {
      console.info(
        `[mail:console] to=${m.to} subject=${JSON.stringify(m.subject)} (${m.html.length} bytes html)`,
      );
    },
  };
}

function resendMailer(apiKey: string, from: string): MailAdapter {
  return {
    provider: "resend",
    async send(m) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text }),
      });
      if (!res.ok) throw new MailError(`resend ${res.status}`);
    },
  };
}

function gmailMailer(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  from: string,
): MailAdapter {
  const auth = new OAuth2Client({ clientId, clientSecret });
  auth.setCredentials({ refresh_token: refreshToken });
  return {
    provider: "gmail",
    async send(m) {
      const raw = toBase64Url(
        buildMime({ from, to: m.to, subject: m.subject, html: m.html, text: m.text }),
      );
      const res = await auth.request({
        url: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        method: "POST",
        data: { raw },
      });
      if (res.status >= 300) throw new MailError(`gmail ${res.status}`);
    },
  };
}

export async function getMailer(): Promise<MailAdapter> {
  const env = serverEnv();
  if (env.MAIL_PROVIDER === "resend" && env.RESEND_API_KEY)
    return resendMailer(env.RESEND_API_KEY, env.MAIL_FROM);
  if (env.MAIL_PROVIDER === "gmail") {
    const token = await loadGoogleToken();
    if (!token || !env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET)
      throw new MailError("Gmail is not connected");
    return gmailMailer(
      env.GOOGLE_OAUTH_CLIENT_ID,
      env.GOOGLE_OAUTH_CLIENT_SECRET,
      token,
      env.MAIL_FROM,
    );
  }
  return consoleMailer();
}
