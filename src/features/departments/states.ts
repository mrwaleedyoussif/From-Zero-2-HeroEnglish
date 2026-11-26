import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  applyStates,
  type Audience,
  type Department,
  type DepartmentState,
  isAudience,
} from "./catalog";

/**
 * The Owner's choices for every audience, read once per request. The table is not secret (the
 * public departments page shows the result), so it is read with the server's own client.
 */
export const departmentStates = cache(
  async (): Promise<Map<Audience, Map<string, DepartmentState>>> => {
    const { data } = await createAdminClient()
      .from("department_states")
      .select("audience, department, state")
      .limit(1000);
    const out = new Map<Audience, Map<string, DepartmentState>>();
    for (const row of data ?? []) {
      if (!isAudience(row.audience)) continue;
      const list = out.get(row.audience) ?? new Map<string, DepartmentState>();
      list.set(row.department, row.state as DepartmentState);
      out.set(row.audience, list);
    }
    return out;
  },
);

/** The departments an audience sees, in order: open ones, "soon" ones; hidden ones left out. */
export async function departmentsFor(audience: Audience): Promise<Department[]> {
  return applyStates(audience, (await departmentStates()).get(audience) ?? new Map());
}
