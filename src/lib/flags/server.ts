import "server-only";
import { cache } from "react";
import type { Actor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Feature flags (SPEC §4): a flag is on when enabled and rolled out to everyone or to one of
 * the user's subjects (user, class, grade, school, role, plan). SQL `feature_flags_for` decides.
 */
const flagsFor = cache(async (userId: string): Promise<ReadonlySet<string>> => {
  const db = await createClient();
  const { data, error } = await db.rpc("feature_flags_for", { p_user: userId });
  if (error) throw new Error("Could not load feature flags", { cause: error });
  return new Set(data ?? []);
});

export async function isFeatureOn(actor: Actor, key: string): Promise<boolean> {
  return (await flagsFor(actor.effective.id)).has(key);
}
