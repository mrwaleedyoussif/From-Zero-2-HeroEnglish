import "server-only";
import { cache } from "react";
import type { Actor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Feature flags (SPEC §4). Every feature is on unless the Owner made a flag for it: a flag
 * switches the feature off, or limits it to a list of subjects (user, class, grade, school,
 * role, plan). SQL `feature_flags_off_for` returns the features that are off for a user.
 */
const flagsOffFor = cache(async (userId: string): Promise<ReadonlySet<string>> => {
  const db = await createClient();
  const { data, error } = await db.rpc("feature_flags_off_for", { p_user: userId });
  // Before the database has the function (code deployed ahead of its migration): nothing is off.
  if (error) return new Set();
  return new Set(data ?? []);
});

export async function isFeatureOnFor(userId: string, key: string): Promise<boolean> {
  return !(await flagsOffFor(userId)).has(key);
}

export async function isFeatureOn(actor: Actor, key: string): Promise<boolean> {
  return isFeatureOnFor(actor.effective.id, key);
}
