import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { ReportData } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Staff sections: the recipient's supervised teachers (usage), their own coaching follow-ups,
 * and coaching activity with their supervisees — all from the supervision graph.
 */
export async function staffSections(
  admin: Admin,
  userId: string,
  p: { start: string; end: string },
): Promise<Pick<ReportData, "teachers" | "followUps" | "coaching">> {
  const since = `${p.start}T00:00:00Z`;
  const until = `${p.end}T23:59:59Z`;
  const [{ data: links }, { data: followUps }] = await Promise.all([
    admin
      .from("supervision_links")
      .select("supervisee_id, profiles!supervision_links_supervisee_id_fkey(full_name, kind)")
      .eq("supervisor_id", userId)
      .is("active_to", null),
    admin
      .from("coaching_logs")
      .select("follow_up_on, profiles!coaching_logs_teacher_id_fkey(full_name)")
      .eq("coach_id", userId)
      .eq("status", "open")
      .not("follow_up_on", "is", null)
      .lte("follow_up_on", until),
  ]);
  // Supervisees who teach a class (the usage figures are about teaching).
  const candidates = (links ?? [])
    .filter((l) => l.profiles?.kind === "staff")
    .map((l) => l.supervisee_id);
  const { data: teaching } = candidates.length
    ? await admin.from("teaching_assignments").select("teacher_id").in("teacher_id", candidates)
    : { data: [] };
  const teachers = new Set((teaching ?? []).map((t) => t.teacher_id));
  const staff = (links ?? []).filter((l) => teachers.has(l.supervisee_id));
  const ids = staff.map((l) => l.supervisee_id);
  const [made, kudos, logs, signIns] = ids.length
    ? await Promise.all([
        admin
          .from("assignments")
          .select("created_by")
          .in("created_by", ids)
          .gte("created_at", since),
        admin.from("xp_events").select("meta").eq("event_type", "kudos").gte("created_at", since),
        admin
          .from("coaching_logs")
          .select(
            "observed_on, coach:profiles!coaching_logs_coach_id_fkey(full_name), teacher:profiles!coaching_logs_teacher_id_fkey(full_name)",
          )
          .in("teacher_id", ids)
          .gte("observed_on", p.start)
          .lte("observed_on", p.end),
        Promise.all(
          ids.map(
            async (id) =>
              (await admin.auth.admin.getUserById(id)).data.user?.last_sign_in_at ?? null,
          ),
        ),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, []];

  return {
    teachers: staff.map((l, i) => ({
      name: l.profiles?.full_name ?? "",
      assignments: (made.data ?? []).filter((m) => m.created_by === l.supervisee_id).length,
      kudos: (kudos.data ?? []).filter(
        (k) => (k.meta as { from?: string } | null)?.from === l.supervisee_id,
      ).length,
      lastSignIn: signIns[i] ?? null,
    })),
    followUps: (followUps ?? []).map((f) => ({
      teacher: f.profiles?.full_name ?? "",
      date: f.follow_up_on ?? "",
    })),
    coaching: (logs.data ?? []).map((l) => ({
      coach: l.coach?.full_name ?? "",
      teacher: l.teacher?.full_name ?? "",
      date: l.observed_on,
    })),
  };
}
