import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function plansWithEntitlements() {
  const db = await createClient();
  const { data, error } = await db
    .from("plans")
    .select("id, key, name_en, name_ar, status, plan_entitlements(key, limit_value)")
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function schoolSubscriptions() {
  const db = await createClient();
  const { data, error } = await db
    .from("schools")
    .select("id, code, name_en, name_ar, subscriptions(plan_id, status, free_until)")
    .order("code");
  if (error) throw error;
  return data.map((s) => {
    const sub = Array.isArray(s.subscriptions) ? s.subscriptions[0] : s.subscriptions;
    return { ...s, subscription: sub ?? null };
  });
}
