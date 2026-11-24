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

/** Sent when the Owner approves a request: the learner can now sign in. */
export function approvedEmail(to: string, url: string, locale: "en" | "ar"): MailMessage {
  const en = [
    "You're in! Your Zero-2-Hero English account is approved.",
    "Sign in with your email:",
  ];
  const ar = ["تمت الموافقة على حسابك في Zero-2-Hero English.", "سجّل الدخول ببريدك الإلكتروني:"];
  const [first, second] = locale === "ar" ? [ar, en] : [en, ar];
  const block = (t: string[], dir: string) =>
    `<div dir="${dir}" style="margin:0 0 18px"><p style="font-size:18px;font-weight:bold;margin:0 0 6px">${t[0]}</p><p style="margin:0">${t[1]} <a href="${url}">${url}</a></p></div>`;
  return {
    to,
    subject: first[0] ?? "",
    text: `${first.join("\n")}\n${url}\n\n${second.join("\n")}\n${url}\n`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:480px;margin:0 auto;padding:24px">${block(first, locale === "ar" ? "rtl" : "ltr")}${block(second, locale === "ar" ? "ltr" : "rtl")}</div>`,
  };
}

const escape = (v: string) =>
  v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** Tells the Owner that someone is waiting for approval, with a link to the list. */
export function requestEmail(
  to: string,
  learner: { name: string; email: string },
  url: string,
): MailMessage {
  const who = `${learner.name} (${learner.email})`;
  return {
    to,
    subject: `New learner waiting for approval: ${learner.name}`,
    text: `${who} asked to join Zero-2-Hero English as a general learner.\n\nApprove or reject: ${url}\n\nطلب ${who} الانضمام كمتعلّم عام. للموافقة أو الرفض: ${url}\n`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:480px;margin:0 auto;padding:24px"><p style="font-size:18px;font-weight:bold;margin:0 0 8px">A new learner is waiting for approval</p><p style="margin:0 0 16px">${escape(who)} asked to join Zero-2-Hero English as a general learner.</p><p style="margin:0 0 20px"><a href="${url}" style="background:#0e223d;color:#f6dc9c;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Approve or reject</a></p><p dir="rtl" style="margin:0;color:#475569">طلب ${escape(who)} الانضمام كمتعلّم عام. افتح الرابط للموافقة أو الرفض.</p></div>`,
  };
}
