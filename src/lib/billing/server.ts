import "server-only";
import { cache } from "react";
import type { Actor } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { effectivePlanKey, type Entitlement, grants, limitOf } from "./entitlements";

/** Entitlements of the plan a school is on (free while BILLING_ENABLED=false). */
export const schoolEntitlements = cache(async (schoolId: string | null): Promise<Entitlement[]> => {
  const db = await createClient();
  let planKey: string | null = null;
  if (schoolId) {
    const { data } = await db
      .from("subscriptions")
      .select("status, plans(key)")
      .eq("school_id", schoolId)
      .maybeSingle();
    planKey = data && data.status !== "canceled" ? (data.plans?.key ?? null) : null;
  }
  const key = effectivePlanKey(serverEnv().BILLING_ENABLED, planKey);
  const { data } = await db
    .from("plan_entitlements")
    .select("key, limit_value, plans!inner(key)")
    .eq("plans.key", key);
  return (data ?? []).map((e) => ({ key: e.key, limit_value: e.limit_value }));
});

/** hasEntitlement(actor, key): does the user's school plan include this module/feature? */
export async function hasEntitlement(actor: Actor, key: string): Promise<boolean> {
  // Platform staff (no school) are not limited by any school's plan.
  if (!actor.effective.school_id) return true;
  return grants(await schoolEntitlements(actor.effective.school_id), key);
}

/** limit(schoolId, "limit.students") → number (Infinity = unlimited). */
export async function limit(schoolId: string, key: string): Promise<number> {
  return limitOf(await schoolEntitlements(schoolId), key);
}
