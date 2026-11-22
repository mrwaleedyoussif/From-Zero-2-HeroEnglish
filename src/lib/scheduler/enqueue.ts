import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { monthlyPeriod, type Period, weeklyPeriod } from "./plan";

type Admin = ReturnType<typeof createAdminClient>;

export interface PlannedJob {
  kind: "report" | "email" | "pdf" | "archive_responses" | "refresh_insights";
  dedupe_key: string;
  school_id?: string | null;
  recipient_id?: string | null;
  report_id?: string | null;
  period?: "weekly" | "monthly" | null;
  period_start?: string | null;
  priority?: number;
  run_after?: string;
}

/** Insert jobs whose dedupe key is new; returns how many were actually added (idempotent). */
export async function enqueue(admin: Admin, jobs: PlannedJob[]): Promise<number> {
  if (jobs.length === 0) return 0;
  const { data, error } = await admin
    .from("report_jobs")
    .upsert(jobs, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export interface Recipient {
  user_id: string;
  full_name: string;
  email: string | null;
  locale: string;
  priority: number;
}

export async function recipients(admin: Admin, schoolId: string, period: "weekly" | "monthly") {
  const { data } = await admin.rpc("report_recipients", { p_school: schoolId, p_period: period });
  return (data ?? []) as Recipient[];
}

export async function activeSchools(admin: Admin) {
  const { data } = await admin
    .from("schools")
    .select("id, code, name_en, timezone, week_start")
    .eq("status", "active");
  return data ?? [];
}

/** Report jobs due now for every school, plus the daily and monthly maintenance jobs. */
export async function planDue(
  admin: Admin,
  now: Date,
): Promise<{ planned: number; periods: Period[] }> {
  const jobs: PlannedJob[] = [];
  const periods: Period[] = [];
  for (const school of await activeSchools(admin)) {
    for (const p of [
      weeklyPeriod(now, school.timezone, school.week_start),
      monthlyPeriod(now, school.timezone),
    ]) {
      periods.push(p);
      for (const r of await recipients(admin, school.id, p.period))
        jobs.push({
          kind: "report",
          dedupe_key: `report:${p.period}:${p.start}:${r.user_id}`,
          school_id: school.id,
          recipient_id: r.user_id,
          period: p.period,
          period_start: p.start,
          priority: r.priority,
        });
    }
  }
  const day = now.toISOString().slice(0, 10);
  // Refresh dashboards daily; archive old responses once a month (DB budget, SPEC §12).
  jobs.push({ kind: "refresh_insights", dedupe_key: `refresh:${day}`, priority: 0 });
  jobs.push({ kind: "archive_responses", dedupe_key: `archive:${day.slice(0, 7)}`, priority: 9 });
  return { planned: await enqueue(admin, jobs), periods };
}
