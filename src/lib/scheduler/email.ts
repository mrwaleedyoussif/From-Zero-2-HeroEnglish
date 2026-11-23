import "server-only";
import { renderDigest } from "@/features/reports/emails/digest";
import type { ReportData } from "@/features/reports/types";
import { getMailer } from "@/lib/mail";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/db";
import { Deferred, locale, reportUrl } from "./handlers";

type Admin = ReturnType<typeof createAdminClient>;

/** A "sending" row this old belongs to a run that was cut off: the send is taken over. */
const STALE_MS = 10 * 60_000;

/**
 * Claim the one email_log row for this report (report_id is unique, so two ticks can't both
 * send). False = already sent. A fresh "sending" row means another run has it: retry later.
 */
async function claim(admin: Admin, row: { report_id: string; recipient_id: string | null }) {
  const mailer = await getMailer();
  const day = new Date().toISOString().slice(0, 10);
  const { error } = await admin
    .from("email_log")
    .insert({ ...row, provider: mailer.provider, day });
  if (!error) return mailer;
  if (error.code !== "23505") throw new Error(`email_log: ${error.message}`);
  const { data: existing } = await admin
    .from("email_log")
    .select("id, status, created_at")
    .eq("report_id", row.report_id)
    .maybeSingle();
  if (existing?.status === "sent") return null;
  if (existing && Date.now() - Date.parse(existing.created_at) < STALE_MS)
    throw new Error("email is being sent by another run");
  // Left behind by a run that stopped mid-send: take it over (and count it against today).
  const { data: taken } = await admin
    .from("email_log")
    .update({ status: "sending", day, created_at: new Date().toISOString() })
    .eq("report_id", row.report_id)
    .neq("status", "sent")
    .select("id");
  if (!taken?.length) return claim(admin, row);
  return mailer;
}

/**
 * Send the digest once and only within today's budget — otherwise Deferred, and the job waits
 * until tomorrow.
 */
export async function handleEmail(admin: Admin, job: Tables<"report_jobs">, budget: number) {
  const { data: report } = await admin
    .from("reports")
    .select("id, data, recipient_id")
    .eq("id", job.report_id ?? "")
    .single();
  const { data: person } = await admin
    .from("profiles")
    .select("full_name, email, locale")
    .eq("id", report?.recipient_id ?? "")
    .single();
  if (!report || !person?.email) return; // nothing to send to
  const day = new Date().toISOString().slice(0, 10);
  const { count } = await admin
    .from("email_log")
    .select("id", { count: "exact", head: true })
    .eq("day", day)
    .in("status", ["sending", "sent"]);
  if ((count ?? 0) >= budget) throw new Deferred();
  const mailer = await claim(admin, { report_id: report.id, recipient_id: report.recipient_id });
  if (!mailer) return; // already sent
  const l = locale(person.locale);
  try {
    const mail = await renderDigest({
      locale: l,
      name: person.full_name,
      data: report.data as unknown as ReportData,
      url: reportUrl(report.id, l),
    });
    await mailer.send({ to: person.email, ...mail });
  } catch (e) {
    await admin.from("email_log").delete().eq("report_id", report.id); // let a retry send it
    throw e;
  }
  await admin.from("email_log").update({ status: "sent" }).eq("report_id", report.id);
  await admin.rpc("bump_usage", { p_kind: "email", p_n: 1 }); // Owner's budget meter
  await admin.from("reports").update({ emailed_at: new Date().toISOString() }).eq("id", report.id);
}
