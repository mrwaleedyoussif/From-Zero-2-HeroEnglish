import "server-only";
import { randomBytes } from "node:crypto";
import { serverEnv } from "@/lib/env";
import type { createAdminClient } from "@/lib/supabase/admin";
import { dayStart, localDay } from "@/lib/time";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * General learners are people outside any school. They all belong to one school record of
 * their own, so every rule that keeps a school's data to itself applies to them unchanged:
 * no school sees them, and they see no school.
 */
export const GENERAL_CODE = "GENERAL";

export async function generalSchoolId(admin: Admin): Promise<string> {
  const find = () => admin.from("schools").select("id").eq("code", GENERAL_CODE).maybeSingle();
  const { data: existing } = await find();
  if (existing) return existing.id;
  await admin.from("schools").insert({
    code: GENERAL_CODE,
    name_en: "General learners",
    name_ar: "المتعلمون العامون",
    // Listed for the Owner, but never offered on the home page's school list.
    status: "archived",
  });
  const { data: made } = await find(); // also covers two first sign-ups at the same moment
  if (!made) throw new Error("Could not prepare the general learners group");
  return made.id;
}

/** New general learners today (school time), for the daily cap. */
export async function signupsToday(admin: Admin): Promise<number> {
  const { data: school } = await admin
    .from("schools")
    .select("id")
    .eq("code", GENERAL_CODE)
    .maybeSingle();
  if (!school) return 0;
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("school_id", school.id)
    .gte("created_at", dayStart(localDay()));
  return count ?? 0;
}

/** Students need a username; a general learner's is random and never shown or typed. */
export const randomUsername = () => `g${randomBytes(8).toString("hex")}`;

/**
 * Whether general learners can sign up and sign in: the Owner's switch is on, and codes can
 * really be delivered (the "console" mail provider only logs them, which is for development).
 */
export function learnersOpen(): boolean {
  try {
    const env = serverEnv();
    return (
      env.GENERAL_LEARNERS_ENABLED &&
      (env.MAIL_PROVIDER !== "console" || process.env.NODE_ENV !== "production")
    );
  } catch {
    return false; // environment not configured (e.g. a bare build)
  }
}
