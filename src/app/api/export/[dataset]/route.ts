import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { toCsv } from "@/features/insights/analytics";
import { classStats, studentStats, teacherUsage } from "@/features/insights/queries";
import { canSomewhere } from "@/lib/auth/can";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const PRIVATE = { "Cache-Control": "private, no-store" };
const DATASETS = {
  classes: ["students:view", "supervision:view"],
  students: ["students:view"],
  teachers: ["supervision:view"],
  coaching: ["coaching:log", "supervision:view"],
} as const;
const query = z.object({ school: z.guid().optional(), class: z.guid().optional() });

/**
 * GET /api/export/<dataset>.csv — CSV of any dashboard table (SPEC §11). Data comes from the same
 * scoped DB functions / RLS as the screen, so an export never shows more than the dashboard.
 */
export async function GET(req: NextRequest, { params }: RouteContext<"/api/export/[dataset]">) {
  const { dataset } = await params;
  if (!(dataset in DATASETS)) return new NextResponse(null, { status: 404, headers: PRIVATE });
  const actor = await getActor();
  if (!actor) return new NextResponse(null, { status: 401, headers: PRIVATE });
  const perms = DATASETS[dataset as keyof typeof DATASETS];
  const allowed = await Promise.all(perms.map((p) => canSomewhere(actor, p)));
  if (!allowed.some(Boolean)) return new NextResponse(null, { status: 403, headers: PRIVATE });
  const q = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!q.success) return new NextResponse(null, { status: 400, headers: PRIVATE });
  const school = q.data.school ?? actor.effective.school_id ?? null;

  let csv: string;
  if (dataset === "classes") {
    const rows = await classStats(school);
    csv = toCsv(
      [
        "class",
        "grade",
        "students",
        "active_7d",
        "lessons_7d",
        "accuracy_7d",
        "xp_7d",
        "overdue",
        "avg_theta",
        "avg_growth",
        "at_risk",
      ],
      rows.map((r) => [
        r.class_code,
        r.grade_code,
        r.students,
        r.active_7d,
        r.lessons_7d,
        r.accuracy_7d,
        r.xp_7d,
        r.overdue,
        r.avg_theta,
        r.avg_growth,
        r.at_risk,
      ]),
    );
  } else if (dataset === "students") {
    if (!q.data.class) return new NextResponse(null, { status: 400, headers: PRIVATE });
    const rows = await studentStats(q.data.class);
    csv = toCsv(
      [
        "student",
        "cefr",
        "theta",
        "theta_first",
        "lessons_7d",
        "active_days_7d",
        "accuracy_7d",
        "xp_7d",
        "overdue",
        "last_active_at",
      ],
      rows.map((r) => [
        r.full_name,
        r.cefr_now,
        r.theta_now,
        r.theta_first,
        r.lessons_7d,
        r.active_days_7d,
        r.accuracy_7d,
        r.xp_7d,
        r.overdue,
        r.last_active_at,
      ]),
    );
  } else if (dataset === "teachers") {
    if (!school) return new NextResponse(null, { status: 400, headers: PRIVATE });
    const rows = await teacherUsage(school);
    csv = toCsv(
      [
        "teacher",
        "classes",
        "assignments_30d",
        "last_assignment_at",
        "kudos_30d",
        "last_sign_in_at",
      ],
      rows.map((r) => [
        r.full_name,
        r.classes,
        r.assignments_30d,
        r.last_assignment_at,
        r.kudos_30d,
        r.last_sign_in_at,
      ]),
    );
  } else {
    const { data } = await (
      await createClient()
    )
      .from("coaching_logs")
      .select(
        "observed_on, kind, notes, agreed_actions, follow_up_on, status, scores, teacher:profiles!coaching_logs_teacher_id_fkey(full_name), coach:profiles!coaching_logs_coach_id_fkey(full_name)",
      )
      .order("observed_on", { ascending: false })
      .limit(1000);
    csv = toCsv(
      [
        "observed_on",
        "coach",
        "teacher",
        "kind",
        "scores",
        "notes",
        "agreed_actions",
        "follow_up_on",
        "status",
      ],
      (data ?? []).map((r) => [
        r.observed_on,
        r.coach?.full_name,
        r.teacher?.full_name,
        r.kind,
        JSON.stringify(r.scores),
        r.notes,
        r.agreed_actions,
        r.follow_up_on,
        r.status,
      ]),
    );
  }
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      ...PRIVATE,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="linguapath-${dataset}-${day}.csv"`,
    },
  });
}
