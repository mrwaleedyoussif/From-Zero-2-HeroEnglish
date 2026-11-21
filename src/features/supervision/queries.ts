import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function supervisionForSchool(schoolId: string) {
  const db = await createClient();
  const [links, staff] = await Promise.all([
    db
      .from("supervision_links")
      .select(
        "id, kind, source, active_from, supervisor:profiles!supervision_links_supervisor_id_fkey(id, full_name), supervisee:profiles!supervision_links_supervisee_id_fkey(id, full_name)",
      )
      .eq("school_id", schoolId)
      .is("active_to", null)
      .order("active_from"),
    db
      .from("profiles")
      .select("id, full_name")
      .eq("school_id", schoolId)
      .eq("kind", "staff")
      .eq("status", "active")
      .order("full_name"),
  ]);

  // Group by supervisor for a simple tree: supervisor → supervisees.
  const groups = new Map<string, { name: string; links: NonNullable<typeof links.data> }>();
  for (const l of links.data ?? []) {
    if (!l.supervisor) continue;
    const g = groups.get(l.supervisor.id) ?? { name: l.supervisor.full_name, links: [] };
    g.links.push(l);
    groups.set(l.supervisor.id, g);
  }
  return { groups: [...groups.values()], staff: staff.data ?? [] };
}
