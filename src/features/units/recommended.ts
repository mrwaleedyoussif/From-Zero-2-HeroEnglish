import "server-only";
import type { Actor } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Units a teacher recommended to this learner, newest first, with whether each is finished. */
export async function recommendedUnits(actor: Actor) {
  const db = await createClient();
  const id = actor.effective.id;
  const [{ data: recs }, { data: done }] = await Promise.all([
    db
      .from("unit_recommendations")
      .select(
        "unit_id, note, created_at, profiles!unit_recommendations_recommended_by_fkey(full_name)",
      )
      .eq("student_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("course_unit_progress")
      .select("unit_id")
      .eq("student_id", id)
      .not("completed_at", "is", null)
      .limit(1000),
  ]);
  const finished = new Set((done ?? []).map((d) => d.unit_id));
  // Learners never read the units table (it holds answer keys): the server reads the titles.
  const ids = (recs ?? []).map((r) => r.unit_id);
  const { data: units } = ids.length
    ? await createAdminClient()
        .from("course_units")
        .select("id, title, strand, level")
        .in("id", ids)
        .eq("status", "active")
    : { data: [] };
  return (recs ?? []).flatMap((r) => {
    const unit = units?.find((u) => u.id === r.unit_id);
    return unit
      ? [
          {
            id: unit.id,
            title: unit.title,
            strand: unit.strand,
            level: unit.level,
            note: r.note,
            from: r.profiles?.full_name ?? "",
            done: finished.has(unit.id),
          },
        ]
      : [];
  });
}

/** How many students a unit was recommended to by the people this member of staff may see. */
export async function recommendedCount(unitId: string): Promise<number> {
  const db = await createClient();
  const { count } = await db
    .from("unit_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("unit_id", unitId);
  return count ?? 0;
}
