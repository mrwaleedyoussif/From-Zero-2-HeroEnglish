import type { MailMessage } from "@/lib/mail";

/** The one-time code email, in both languages (the reader's first). Pure, so it is tested. */
export function codeEmail(to: string, code: string, locale: "en" | "ar"): MailMessage {
  const en = {
    dir: "ltr",
    hello: "Your sign-in code for Zero-2-Hero English",
    use: "Type this code on the sign-in page. It works once and expires soon.",
    ignore: "If you did not ask for it, you can ignore this email.",
  };
  const ar = {
    dir: "rtl",
    hello: "رمز الدخول إلى Zero-2-Hero English",
    use: "اكتب هذا الرمز في صفحة الدخول. يُستخدم مرة واحدة وتنتهي صلاحيته قريبًا.",
    ignore: "إذا لم تطلبه فتجاهل هذه الرسالة.",
  };
  const [first, second] = locale === "ar" ? [ar, en] : [en, ar];
  const block = (t: typeof en) =>
    `<div dir="${t.dir}" style="margin:0 0 20px"><p style="font-size:18px;font-weight:bold;margin:0 0 8px">${t.hello}</p><p style="margin:0 0 6px">${t.use}</p><p style="margin:0;color:#475569;font-size:13px">${t.ignore}</p></div>`;
  return {
    to,
    subject: `${code} — ${first.hello}`,
    text: `${first.hello}\n\n${code}\n\n${first.use}\n${first.ignore}\n\n${second.hello}\n${second.use}\n${second.ignore}\n`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:480px;margin:0 auto;padding:24px">${block(first)}<p dir="ltr" style="font-size:34px;font-weight:bold;letter-spacing:8px;text-align:center;background:#0e223d;color:#f6dc9c;border-radius:12px;padding:16px;margin:0 0 20px">${code}</p>${block(second)}</div>`,
  };
}
