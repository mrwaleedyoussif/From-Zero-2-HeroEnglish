import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { PAGE, selectAll } from "@/lib/supabase/batch";
import { type HistoryEvent, newBadges } from "./engine/badges";
import { type Level, levelsCrossed } from "./engine/levels";
import { EVENT_TYPES, type EventType } from "./engine/rules";

type Admin = ReturnType<typeof createAdminClient>;

export { totalXp } from "./totals";

/** Badges whose rules now hold: recorded, bonus XP added, learner notified. Returns codes. */
export async function checkBadges(
  admin: Admin,
  studentId: string,
  schoolId: string,
  streak: number,
): Promise<string[]> {
  const since = new Date(Date.now() - 366 * 86_400_000).toISOString();
  const [{ data: badges }, { data: owned }, { data: events }] = await Promise.all([
    admin.from("badges").select("id, code, rule, xp_bonus").eq("status", "active"),
    admin.from("user_badges").select("badges(code)").eq("student_id", studentId),
    selectAll(
      (after) => {
        const q = admin
          .from("xp_events")
          .select("id, event_type, created_at, meta")
          .eq("student_id", studentId)
          .gte("created_at", since);
        return (after ? q.gt("id", after) : q).order("id").limit(PAGE);
      },
      (r) => r.id,
    ),
  ]);
  const history: HistoryEvent[] = (events ?? [])
    .filter((e) => (EVENT_TYPES as readonly string[]).includes(e.event_type))
    .map((e) => {
      const m = (e.meta ?? {}) as Record<string, unknown>;
      const str = (k: string) => (typeof m[k] === "string" ? (m[k] as string) : null);
      return {
        type: e.event_type as EventType,
        at: new Date(e.created_at),
        accuracy: typeof m.accuracy === "number" ? m.accuracy : null,
        skill: str("skill"),
        cefr: str("cefr"),
        format: str("format"),
        department: str("department"),
      };
    });
  const already = new Set((owned ?? []).map((o) => o.badges?.code).filter((c): c is string => !!c));
  const earned = newBadges(badges ?? [], history, streak, already, new Date());
  for (const code of earned) {
    const badge = (badges ?? []).find((b) => b.code === code);
    if (!badge) continue;
    const { error } = await admin
      .from("user_badges")
      .insert({ student_id: studentId, badge_id: badge.id, school_id: schoolId });
    if (error) continue; // awarded concurrently
    if (badge.xp_bonus > 0)
      await admin.from("xp_events").insert({
        student_id: studentId,
        school_id: schoolId,
        event_type: "badge_bonus",
        xp: badge.xp_bonus,
        source_key: code,
      });
    await admin.from("notifications").insert({
      user_id: studentId,
      school_id: schoolId,
      kind: "badge",
      params: { badge: code },
      href: "/student/rewards",
    });
  }
  return earned;
}

/** Levels reached between two XP totals: a certificate and a notification for each. */
export async function recordLevelUps(
  admin: Admin,
  studentId: string,
  schoolId: string,
  before: number,
  after: number,
): Promise<Level[]> {
  const { data: levels } = await admin
    .from("levels")
    .select("level, name_en, name_ar, xp_required");
  const crossed = levelsCrossed(before, after, levels ?? []).filter((l) => l.xp_required > 0);
  for (const l of crossed) {
    await admin
      .from("certificates")
      .upsert(
        { student_id: studentId, school_id: schoolId, kind: "level", value: String(l.level) },
        { onConflict: "student_id,kind,value,department_id", ignoreDuplicates: true },
      );
    await admin.from("notifications").insert({
      user_id: studentId,
      school_id: schoolId,
      kind: "level_up",
      params: { level: l.level, name_en: l.name_en, name_ar: l.name_ar },
      href: "/student/rewards",
    });
  }
  return crossed;
}

/** A CEFR milestone certificate when a test result beats the learner's best in a department. */
export async function cefrMilestone(
  admin: Admin,
  studentId: string,
  schoolId: string,
  departmentId: string,
  cefr: string,
) {
  await admin.from("certificates").upsert(
    {
      student_id: studentId,
      school_id: schoolId,
      kind: "cefr",
      value: cefr,
      department_id: departmentId,
    },
    { onConflict: "student_id,kind,value,department_id", ignoreDuplicates: true },
  );
}
