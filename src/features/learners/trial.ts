import "server-only";
import { cache } from "react";
import type { Actor } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/** When a trial that starts now ends (the number of days is `LEARNER_TRIAL_DAYS`, 3 by default). */
export const trialEnd = (from = Date.now()) =>
  new Date(from + serverEnv().LEARNER_TRIAL_DAYS * 86_400_000).toISOString();

/**
 * A general learner on a free trial waits for the Owner again once the trial is over: the
 * account is switched off (the request stays in the Owner's list). True when that happened.
 */
export const trialIsOver = cache(async (actor: Actor): Promise<boolean> => {
  if (actor.viewAs || actor.real.kind !== "student") return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("learner_requests")
    .select("status, trial_ends_at")
    .eq("user_id", actor.real.id)
    .maybeSingle();
  if (!data?.trial_ends_at || data.status !== "pending") return false;
  if (new Date(data.trial_ends_at).getTime() > Date.now()) return false;
  await admin.from("profiles").update({ status: "disabled" }).eq("id", actor.real.id);
  return true;
});
