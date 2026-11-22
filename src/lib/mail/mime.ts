/** Minimal RFC 5322 / MIME builder for the Gmail API ("raw" message), UTF-8 safe. Pure. */

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

/** Encoded-word header value when it isn't plain ASCII (Arabic subjects, names). */
export function encodeHeader(value: string): string {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${b64(value)}?=`;
}

/** Wrap base64 at 76 characters (RFC 2045). */
const wrap = (s: string) => s.replace(/.{1,76}/g, (line) => `${line}\r\n`).trimEnd();

export interface MimeInput {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  boundary?: string;
}

export function buildMime({
  from,
  to,
  subject,
  html,
  text,
  boundary = "lp-boundary",
}: MimeInput): string {
  if (/[\r\n]/.test(to + from + subject)) throw new Error("header injection");
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap(b64(text)),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap(b64(html)),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

/** Gmail API wants the whole message as base64url. */
export const toBase64Url = (s: string) =>
  Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
