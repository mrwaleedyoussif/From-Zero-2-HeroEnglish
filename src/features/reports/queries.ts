import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ReportData } from "./types";

/** Reports the viewer may read (RLS: own, or the school's for school-level viewers). */
export async function listReports(limit = 50) {
  const db = await createClient();
  const { data } = await db
    .from("reports")
    .select(
      "id, period, period_start, period_end, created_at, emailed_at, drive_file_id, recipient_id, profiles(full_name)",
    )
    .order("period_start", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
export type ReportRow = Awaited<ReturnType<typeof listReports>>[number];

export async function getReport(id: string) {
  const db = await createClient();
  const { data } = await db
    .from("reports")
    .select(
      "id, period, period_start, period_end, data, drive_file_id, emailed_at, created_at, profiles(full_name)",
    )
    .eq("id", id)
    .maybeSingle();
  return data ? { ...data, data: data.data as unknown as ReportData } : null;
}

export async function myPreferences(userId: string) {
  const db = await createClient();
  const { data } = await db
    .from("report_preferences")
    .select("weekly, monthly, email")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? { weekly: true, monthly: true, email: true };
}

/** Owner monitor: queue by kind and status, today's emails, the latest ticks (RLS: Owner only). */
export async function schedulerStatus() {
  const db = await createClient();
  const day = new Date().toISOString().slice(0, 10);
  const [jobs, emails, runs] = await Promise.all([
    db.from("report_jobs").select("kind, status, deferrals, last_error").limit(2000),
    db.from("email_log").select("status, provider").eq("day", day),
    db
      .from("cron_runs")
      .select("source, started_at, finished_at, planned, processed, failed, deferred")
      .order("started_at", { ascending: false })
      .limit(10),
  ]);
  const counts = new Map<string, number>();
  for (const j of jobs.data ?? [])
    counts.set(`${j.kind}/${j.status}`, (counts.get(`${j.kind}/${j.status}`) ?? 0) + 1);
  return {
    queue: [...counts].map(([k, n]) => {
      const [kind, status] = k.split("/") as [string, string];
      return { kind, status, n };
    }),
    deferred: (jobs.data ?? []).filter((j) => j.status === "queued" && j.deferrals > 0).length,
    errors: (jobs.data ?? [])
      .filter((j) => j.status === "failed")
      .map((j) => `${j.kind}: ${j.last_error ?? ""}`)
      .slice(0, 10),
    emailsToday: (emails.data ?? []).filter((e) => e.status !== "failed").length,
    runs: runs.data ?? [],
  };
}
