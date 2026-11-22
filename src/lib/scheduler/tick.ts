import "server-only";
import { serverEnv } from "@/lib/env";
import { StorageNotConnectedError } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { archiveResponses } from "./archive";
import { planDue } from "./enqueue";
import { Deferred, handleEmail, handlePdf, handleReport } from "./handlers";
import { nextDay } from "./plan";

export const MAX_JOBS = 20;
export const MAX_MS = 50_000;
export const MAX_ATTEMPTS = 3;

export interface TickResult {
  planned: number;
  processed: number;
  failed: number;
  deferred: number;
}

/**
 * One scheduler tick (SPEC §12): plan what is due (idempotent dedupe keys), then process at most
 * 20 jobs within 50 s. Safe to run twice or concurrently: jobs are claimed with SKIP LOCKED and
 * each email is recorded once in email_log before it is sent.
 */
export async function runTick(source: string, now = new Date()): Promise<TickResult> {
  const admin = createAdminClient();
  const budget = serverEnv().EMAIL_DAILY_BUDGET;
  const started = Date.now();
  const { data: run } = await admin.from("cron_runs").insert({ source }).select("id").single();
  const result: TickResult = { planned: 0, processed: 0, failed: 0, deferred: 0 };
  result.planned = (await planDue(admin, now)).planned;

  while (
    Date.now() - started < MAX_MS &&
    result.processed + result.failed + result.deferred < MAX_JOBS
  ) {
    const { data: jobs } = await admin.rpc("claim_jobs", { p_n: 5 });
    if (!jobs?.length) break;
    for (const job of jobs) {
      try {
        let again = false;
        if (job.kind === "report") await handleReport(admin, job);
        else if (job.kind === "email") await handleEmail(admin, job, budget);
        else if (job.kind === "pdf") await handlePdf(admin, job);
        else if (job.kind === "archive_responses") again = await archiveResponses(admin, now);
        else if (job.kind === "refresh_insights") await admin.rpc("refresh_insights");
        await admin
          .from("report_jobs")
          .update(again ? { status: "queued", attempts: 0 } : { status: "done", last_error: null })
          .eq("id", job.id);
        result.processed++;
      } catch (e) {
        if (e instanceof Deferred) {
          // Over today's email budget: wait until tomorrow; deferral is not a failed attempt.
          await admin
            .from("report_jobs")
            .update({
              status: "queued",
              run_after: nextDay(now).toISOString(),
              attempts: job.attempts - 1,
              deferrals: job.deferrals + 1,
            })
            .eq("id", job.id);
          result.deferred++;
          continue;
        }
        const permanent = e instanceof StorageNotConnectedError || job.attempts >= MAX_ATTEMPTS;
        await admin
          .from("report_jobs")
          .update({
            status: permanent ? "failed" : "queued",
            run_after: new Date(Date.now() + 2 ** job.attempts * 60_000).toISOString(),
            last_error: e instanceof Error ? e.message.slice(0, 500) : "error",
          })
          .eq("id", job.id);
        result.failed++;
      }
    }
  }
  if (run)
    await admin
      .from("cron_runs")
      .update({ finished_at: new Date().toISOString(), ...result })
      .eq("id", run.id);
  return result;
}
