import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Actor } from "@/lib/auth/session";
import { isFeatureOnFor } from "@/lib/flags/server";
import { defaultVisibility, moduleOf } from "@/lib/registry";
import { createClient } from "@/lib/supabase/server";
import { decide, type VisibilityDecision, type VisibilityRule } from "./engine";

/** Rules that apply to a user (SQL decides which), cached per request. */
export const visibilityRulesFor = cache(async (userId: string): Promise<VisibilityRule[]> => {
  const db = await createClient();
  const { data, error } = await db.rpc("visibility_rules_for", { p_user: userId });
  if (error) throw new Error("Could not load visibility rules", { cause: error });
  return data ?? [];
});

export async function explainVisibility(userId: string, key: string): Promise<VisibilityDecision> {
  return decide(await visibilityRulesFor(userId), key, defaultVisibility(key));
}

/**
 * isVisible(actor, key) — what the effective user sees (so "view as" previews it exactly).
 * Visibility is UX; security stays with can() + RLS.
 */
export async function isVisible(actor: Actor, key: string): Promise<boolean> {
  return isVisibleTo(actor.effective.id, key);
}

/** The same decision for a user id (the signed-in user, or someone they may manage). */
export async function isVisibleTo(userId: string, key: string): Promise<boolean> {
  // Features also have an on/off switch (Visibility Studio → feature flags).
  if (key.startsWith("feature.") && !(await isFeatureOnFor(userId, key))) return false;
  const parent = moduleOf(key);
  if (parent && !(await explainVisibility(userId, parent)).visible) return false;
  return (await explainVisibility(userId, key)).visible;
}

/** Page/action guard: a hidden page behaves as if it did not exist. */
export async function requireVisible(actor: Actor, key: string): Promise<void> {
  if (!(await isVisible(actor, key))) notFound();
}

/** Filter a list by visibility, keeping order. */
export async function visibleOnly<T>(
  actor: Actor,
  items: readonly T[],
  keyOf: (item: T) => string,
): Promise<T[]> {
  const rules = await visibilityRulesFor(actor.effective.id);
  return items.filter((item) => decide(rules, keyOf(item), defaultVisibility(keyOf(item))).visible);
}
