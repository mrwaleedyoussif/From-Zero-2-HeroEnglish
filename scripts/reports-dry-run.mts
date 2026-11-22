/**
 * npm run reports:dry-run -- --week | --month [--date 2026-11-22T06:00:00Z]
 * Prints, without writing or sending anything: who would receive which report (and what is in
 * it), how many digest emails that means, and which would be deferred by the daily budget.
 */
import { parseArgs } from "node:util";
import { buildReport } from "@/features/reports/generate";
import { headline } from "@/features/reports/types";
import { serverEnv } from "@/lib/env";
import { activeSchools, recipients } from "@/lib/scheduler/enqueue";
import { monthlyPeriod, splitByBudget, weeklyPeriod } from "@/lib/scheduler/plan";
import { createAdminClient } from "@/lib/supabase/admin";

const { values } = parseArgs({
  options: { week: { type: "boolean" }, month: { type: "boolean" }, date: { type: "string" } },
});
const period = values.month ? "monthly" : "weekly";
const now = values.date ? new Date(values.date) : new Date();
const admin = createAdminClient();
const budget = serverEnv().EMAIL_DAILY_BUDGET;
const today = now.toISOString().slice(0, 10);
const { count: sentToday } = await admin
  .from("email_log")
  .select("id", { count: "exact", head: true })
  .eq("day", today)
  .in("status", ["sending", "sent"]);

const emails: { id: string; priority: number; createdAt: string; who: string }[] = [];
console.log(
  `LinguaPath ${period} reports — dry run at ${now.toISOString()} (nothing is written or sent)\n`,
);
for (const school of await activeSchools(admin)) {
  const p =
    period === "weekly"
      ? weeklyPeriod(now, school.timezone, school.week_start)
      : monthlyPeriod(now, school.timezone);
  const list = await recipients(admin, school.id, p.period);
  console.log(
    `${school.code} · ${school.name_en} · ${p.start} → ${p.end} · ${list.length} recipients`,
  );
  for (const r of list) {
    const [{ data: done }, { data: prefs }] = await Promise.all([
      admin
        .from("reports")
        .select("id, emailed_at")
        .eq("recipient_id", r.user_id)
        .eq("period", p.period)
        .eq("period_start", p.start)
        .maybeSingle(),
      admin.from("report_preferences").select("email").eq("user_id", r.user_id).maybeSingle(),
    ]);
    const data = await buildReport(
      admin,
      { userId: r.user_id, schoolId: school.id, schoolName: school.name_en },
      p,
    );
    const h = headline(data);
    const sections = Object.entries(data)
      .filter(([, v]) => Array.isArray(v) && v.length > 0)
      .map(([k, v]) => `${k}(${(v as unknown[]).length})`)
      .join(" ");
    const mail = done?.emailed_at
      ? "already emailed"
      : !r.email
        ? "no email address"
        : prefs?.email === false
          ? "email off"
          : "email";
    if (mail === "email")
      emails.push({ id: r.user_id, priority: r.priority, createdAt: "", who: r.full_name });
    console.log(
      `  [p${r.priority}] ${r.full_name.padEnd(22)} ${String(h.classes).padStart(2)} classes, ${String(h.students).padStart(3)} students, ${h.atRisk} at risk · ${sections || "no data"} · ${done ? "report exists" : "new report"} · ${mail}`,
    );
  }
  console.log("");
}
const { send, defer } = splitByBudget(emails, sentToday ?? 0, budget);
console.log(
  `Emails: ${emails.length} digest(s) · already sent today ${sentToday ?? 0} · budget ${budget}/day`,
);
console.log(
  `  would send now: ${send.length}${send.length ? ` (${send.map((e) => e.who).join(", ")})` : ""}`,
);
console.log(
  `  deferred to tomorrow: ${defer.length}${defer.length ? ` (${defer.map((e) => e.who).join(", ")})` : ""}`,
);
