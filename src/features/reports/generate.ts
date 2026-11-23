import { inBatches } from "@/lib/supabase/batch";
import "server-only";
import { cefrDistribution, riskFlags } from "@/features/insights/analytics";
import type { createAdminClient } from "@/lib/supabase/admin";
import { staffSections } from "./generate-staff";
import { type ReportData, suggest } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/**
 * One recipient's report, generated with *their* scope (service role + the `_for` functions,
 * the same rules as the dashboards). Sections are filled only where their scope has data.
 */
export async function buildReport(
  admin: Admin,
  r: { userId: string; schoolId: string; schoolName: string },
  p: { period: "weekly" | "monthly"; start: string; end: string },
): Promise<ReportData> {
  const now = new Date();
  const { data: classes } = await admin.rpc("class_stats_for", {
    p_user: r.userId,
    p_school: r.schoolId,
  });
  const visible = classes ?? [];
  const perClass = await Promise.all(
    visible.map(async (c) => ({
      c,
      students:
        (await admin.rpc("student_stats_for", { p_user: r.userId, p_class: c.class_id })).data ??
        [],
    })),
  );
  const people = perClass.flatMap(({ c, students }) =>
    students.map((s) => ({ ...s, cls: c.class_code })),
  );
  const studentClass = new Map(people.map((s) => [s.student_id, s.cls]));

  const [assignments, skillRows, previous, staff] = await Promise.all([
    visible.length
      ? admin
          .from("assignments")
          .select("classes(code), assignment_progress(status)")
          .in(
            "class_id",
            visible.map((c) => c.class_id),
          )
          .gte("created_at", `${p.start}T00:00:00Z`)
          .lte("created_at", `${p.end}T23:59:59Z`)
      : Promise.resolve({ data: [] }),
    // Newest first, a few learners per request: long id lists overflow the URL and a request
    // returns at most 1000 rows.
    inBatches(
      [...studentClass.keys()],
      (ids) =>
        admin
          .from("ability_estimates")
          .select("student_id, theta, skills(code)")
          .in("student_id", ids)
          .not("skill_id", "is", null)
          .order("measured_at", { ascending: false }),
      25,
    ),
    admin
      .from("reports")
      .select("data")
      .eq("recipient_id", r.userId)
      .eq("period", p.period)
      .lt("period_start", p.start)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    staffSections(admin, r.userId, p),
  ]);

  // Lowest average skill θ per class (classes whose learners the recipient may see).
  const sums = new Map<string, { class: string; skill: string; total: number; n: number }>();
  const counted = new Set<string>(); // a learner's latest estimate per skill, not their history
  for (const row of skillRows.data ?? []) {
    const cls = studentClass.get(row.student_id);
    if (!cls || !row.skills) continue;
    if (counted.has(`${row.student_id}/${row.skills.code}`)) continue;
    counted.add(`${row.student_id}/${row.skills.code}`);
    const s = sums.get(`${cls}/${row.skills.code}`) ?? {
      class: cls,
      skill: row.skills.code,
      total: 0,
      n: 0,
    };
    s.total += Number(row.theta);
    s.n += 1;
    sums.set(`${cls}/${row.skills.code}`, s);
  }
  const done = new Map<string, { class: string; assigned: number; done: number }>();
  for (const a of assignments.data ?? []) {
    const k = a.classes?.code ?? "";
    const e = done.get(k) ?? { class: k, assigned: 0, done: 0 };
    e.assigned += a.assignment_progress.length;
    e.done += a.assignment_progress.filter((x) => x.status === "done").length;
    done.set(k, e);
  }
  const prev = new Map(
    ((previous.data?.data as ReportData | undefined)?.cefr ?? []).map((c) => [c.cefr, c.n]),
  );

  const base: Omit<ReportData, "suggestions"> = {
    period: p.period,
    start: p.start,
    end: p.end,
    school: r.schoolName,
    classes: visible.map((c) => ({
      code: c.class_code,
      students: c.students,
      active: c.active_7d,
      lessons: c.lessons_7d,
      accuracy: num(c.accuracy_7d),
      atRisk: c.at_risk,
      overdue: c.overdue,
      growth: num(c.avg_growth),
    })),
    improvers: people
      .map((s) => ({
        name: s.full_name,
        class: s.cls,
        gain: (num(s.theta_now) ?? 0) - (num(s.theta_first) ?? 0),
      }))
      .filter((s) => s.gain > 0)
      .map((s) => ({ ...s, gain: Math.round(s.gain * 100) / 100 }))
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 5),
    atRisk: people
      .map((s) => ({ name: s.full_name, class: s.cls, flags: riskFlags(s, now) }))
      .filter((s) => s.flags.length > 0)
      .slice(0, 15),
    assignments: [...done.values()],
    skillGaps: [...sums.values()]
      .map((s) => ({
        class: s.class,
        skill: s.skill,
        theta: Math.round((s.total / s.n) * 100) / 100,
      }))
      .sort((a, b) => a.theta - b.theta)
      .slice(0, 6),
    cefr: cefrDistribution(people.map((s) => ({ cefr: s.cefr_now ?? "none", n: 1 }))).map((c) => ({
      ...c,
      change: prev.size ? c.n - (prev.get(c.cefr) ?? 0) : null,
    })),
    ...staff,
  };
  return { ...base, suggestions: suggest(base) };
}
