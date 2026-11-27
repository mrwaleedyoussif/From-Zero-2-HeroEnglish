import "server-only";
import { groupsAndTeams, roster } from "@/features/learning/teacher/queries";
import { lastSeen } from "@/features/presence/queries";
import type { Answered } from "@/features/units/queries";
import { createClient } from "@/lib/supabase/server";

const avg = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;

/**
 * One line per student of a class (or of one of its groups): when they were last here, course
 * units, speaking practice, mock exams and handwriting. Row security limits every read to the
 * students this member of staff may see.
 */
export async function monitorClass(classId: string, groupId?: string) {
  const [students, sets, seen] = await Promise.all([
    roster(classId),
    groupsAndTeams(classId),
    lastSeen(),
  ]);
  const group = sets.groups.find((g) => g.id === groupId);
  const shown = group ? students.filter((s) => group.members.includes(s.id)) : students;
  const ids = shown.map((s) => s.id);
  const db = await createClient();
  const [units, mocks, writing] = ids.length
    ? await Promise.all([
        db
          .from("course_unit_progress")
          .select("student_id, correct, total, completed_at, answers, updated_at")
          .in("student_id", ids)
          .limit(5000),
        db
          .from("mock_attempts")
          .select("student_id, score, finished_at")
          .in("student_id", ids)
          .not("finished_at", "is", null)
          .limit(5000),
        db
          .from("handwriting_progress")
          .select("student_id, best")
          .in("student_id", ids)
          .limit(5000),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const rows = shown.map((s) => {
    const mine = (units.data ?? []).filter((u) => u.student_id === s.id);
    const correct = mine.reduce((n, u) => n + u.correct, 0);
    const total = mine.reduce((n, u) => n + u.total, 0);
    const speech = mine.flatMap((u) =>
      Object.entries((u.answers ?? {}) as unknown as Record<string, Answered>)
        .filter(([k]) => k.startsWith("speech:"))
        .map(([, a]) => a.score ?? 0),
    );
    const sat = (mocks.data ?? []).filter((m) => m.student_id === s.id);
    const hand = (writing.data ?? []).filter((h) => h.student_id === s.id).map((h) => h.best);
    return {
      ...s,
      seenAt: seen.get(s.id) ?? null,
      started: mine.length,
      finished: mine.filter((u) => u.completed_at).length,
      accuracy: total ? Math.round((correct / total) * 100) : null,
      speaking: avg(speech),
      mocks: sat.length,
      mockBest: sat.length ? Math.max(...sat.map((m) => m.score ?? 0)) : null,
      handwriting: avg(hand),
      handwritingSteps: hand.length,
      lastWork:
        mine
          .map((u) => u.updated_at)
          .sort()
          .at(-1) ?? null,
    };
  });
  return { rows, groups: sets.groups, group };
}
export type MonitorRow = Awaited<ReturnType<typeof monitorClass>>["rows"][number];

/** One student's work in detail: each unit and each mock exam sat. */
export async function monitorStudent(studentId: string) {
  const db = await createClient();
  const [units, mocks] = await Promise.all([
    db
      .from("course_unit_progress")
      .select(
        "unit_id, correct, total, completed_at, updated_at, course_units(title, level, strand)",
      )
      .eq("student_id", studentId)
      .order("updated_at", { ascending: false })
      .limit(300),
    db
      .from("mock_attempts")
      .select("id, exam_id, score, finished_at, mock_exams(title)")
      .eq("student_id", studentId)
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(60),
  ]);
  return { units: units.data ?? [], mocks: mocks.data ?? [] };
}
