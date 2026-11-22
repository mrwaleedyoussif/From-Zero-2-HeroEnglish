import "server-only";
import { renderDigest, type MailLocale } from "@/features/reports/emails/digest";
import { buildReport } from "@/features/reports/generate";
import { reportPdf } from "@/features/reports/pdf";
import type { ReportData } from "@/features/reports/types";
import { serverEnv } from "@/lib/env";
import { getMailer } from "@/lib/mail";
import { getStorage } from "@/lib/storage";
import { findLayoutFolder } from "@/lib/storage/layout";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/db";
import { periodEnd } from "./plan";
import { enqueue } from "./enqueue";

type Admin = ReturnType<typeof createAdminClient>;
type Job = Tables<"report_jobs">;

/** "Deferred": the email budget is used up for today — try again tomorrow. */
export class Deferred extends Error {}

const locale = (l: string | null | undefined): MailLocale => (l === "ar" ? "ar" : "en");
export const reportUrl = (id: string, l: string) =>
  `${serverEnv().NEXT_PUBLIC_APP_URL}/${locale(l)}/reports/${id}`;

/** Build and store one recipient's report, notify them, and queue the digest email and PDF. */
export async function handleReport(admin: Admin, job: Job) {
  if (!job.recipient_id || !job.school_id || !job.period || !job.period_start)
    throw new Error("bad job");
  const [{ data: school }, { data: prefs }] = await Promise.all([
    admin.from("schools").select("name_en").eq("id", job.school_id).single(),
    admin.from("report_preferences").select("email").eq("user_id", job.recipient_id).maybeSingle(),
  ]);
  const end = periodEnd(job.period as "weekly" | "monthly", job.period_start);
  const data = await buildReport(
    admin,
    { userId: job.recipient_id, schoolId: job.school_id, schoolName: school?.name_en ?? "" },
    { period: job.period as "weekly" | "monthly", start: job.period_start, end },
  );
  const { data: inserted } = await admin
    .from("reports")
    .upsert(
      {
        school_id: job.school_id,
        recipient_id: job.recipient_id,
        period: job.period,
        period_start: job.period_start,
        period_end: end,
        data: data as never,
      },
      { onConflict: "recipient_id,period,period_start", ignoreDuplicates: true },
    )
    .select("id");
  const fresh = inserted?.[0]?.id;
  const { data: report } = await admin
    .from("reports")
    .select("id")
    .eq("recipient_id", job.recipient_id)
    .eq("period", job.period)
    .eq("period_start", job.period_start)
    .single();
  if (!report) throw new Error("report not stored");
  if (fresh)
    await admin.from("notifications").insert({
      user_id: job.recipient_id,
      school_id: job.school_id,
      kind: "report",
      params: { period: job.period, start: job.period_start },
      href: `/reports/${report.id}`,
    });
  await enqueue(admin, [
    ...(prefs?.email === false
      ? []
      : [
          {
            kind: "email" as const,
            dedupe_key: `email:${report.id}`,
            report_id: report.id,
            recipient_id: job.recipient_id,
            school_id: job.school_id,
            priority: job.priority,
          },
        ]),
    {
      kind: "pdf",
      dedupe_key: `pdf:${report.id}`,
      report_id: report.id,
      school_id: job.school_id,
      priority: 8,
    },
  ]);
}

/**
 * Send the digest once (email_log.report_id is unique: a second tick can't send it again) and
 * only within today's budget — otherwise Deferred, and the job waits until tomorrow.
 */
export async function handleEmail(admin: Admin, job: Job, budget: number) {
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
  const mailer = await getMailer();
  const { error: claimed } = await admin.from("email_log").insert({
    report_id: report.id,
    recipient_id: report.recipient_id,
    provider: mailer.provider,
    day,
  });
  if (claimed) return; // already sent (or being sent) by another run
  const l = locale(person.locale);
  try {
    const mail = await renderDigest({
      locale: l,
      name: person.full_name,
      data: report.data as unknown as ReportData,
      url: reportUrl(report.id, l),
    });
    await mailer.send({ to: person.email, ...mail });
    await admin.from("email_log").update({ status: "sent" }).eq("report_id", report.id);
    await admin.rpc("bump_usage", { p_kind: "email", p_n: 1 }); // Owner's budget meter
    await admin
      .from("reports")
      .update({ emailed_at: new Date().toISOString() })
      .eq("id", report.id);
  } catch (e) {
    await admin.from("email_log").delete().eq("report_id", report.id); // let a retry send it
    throw e;
  }
}

/** Archive the report PDF to Drive 04_Reports/{school}/{yyyy}/{mm}/ (SPEC §12). */
export async function handlePdf(admin: Admin, job: Job) {
  const { data: report } = await admin
    .from("reports")
    .select(
      "id, data, period, period_start, drive_file_id, schools(code), profiles(full_name, locale)",
    )
    .eq("id", job.report_id ?? "")
    .single();
  if (!report || report.drive_file_id) return;
  const storage = await getStorage();
  const root = await findLayoutFolder(storage, "04_Reports");
  if (!root) throw new Error("04_Reports folder missing");
  let folder = root;
  for (const name of [
    report.schools?.code ?? "school",
    report.period_start.slice(0, 4),
    report.period_start.slice(5, 7),
  ])
    folder = (await storage.ensureFolder(folder, name)).id;
  const pdf = await reportPdf(
    report.data as unknown as ReportData,
    locale(report.profiles?.locale),
  );
  const who = (report.profiles?.full_name ?? report.id).replace(/[^\p{L}\p{N}]+/gu, "-");
  const file = await storage.upload(
    folder,
    `${report.period}-${report.period_start}-${who}.pdf`,
    "application/pdf",
    new Uint8Array(pdf),
  );
  await admin.from("reports").update({ drive_file_id: file.id }).eq("id", report.id);
}
