import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { groupSchools, type SchoolChoice } from "./school-choices";

/**
 * Active schools for the public home page: names and codes only. Read with the service role on
 * purpose (visitors are not signed in): a school's name and code are what its login cards show.
 * Any failure gives an empty list, and the page simply skips the school step.
 */
export async function publicSchools(): Promise<SchoolChoice[]> {
  try {
    const { data } = await createAdminClient()
      .from("schools")
      .select("code, name_en, name_ar")
      .eq("status", "active")
      .order("name_en")
      .limit(500);
    return groupSchools(data ?? []);
  } catch {
    return [];
  }
}
