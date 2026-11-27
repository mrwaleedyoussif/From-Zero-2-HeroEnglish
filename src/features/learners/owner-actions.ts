"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";
import { getMailer } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { approvedEmail } from "./code-email";
import { inviteSchema } from "./schema";
import { trialEnd } from "./trial";

const refresh = () => revalidatePath("/[locale]/owner/learners", "page");
const idOf = (form: FormData) => z.guid().parse(form.get("id"));

/** The Owner (platform-level permission), not viewing as someone else. */
async function owner(permission: "users:edit" | "users:invite") {
  const actor = await getActor();
  if (!actor) throw new ActionError("signedOut");
  await assertCanWrite(actor, permission, platformTarget);
  return actor;
}

/** A request that is still waiting, with the learner it belongs to (else not found). */
async function waiting(userId: string) {
  const { data } = await createAdminClient()
    .from("learner_requests")
    .select("user_id, profiles!learner_requests_user_id_fkey(email, locale, school_id)")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  if (!data?.profiles) throw new ActionError("notFound");
  return data.profiles;
}

/** Let a waiting learner in, and tell them by email. */
export async function approveLearner(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const id = idOf(form);
    const actor = await owner("users:edit");
    const learner = await waiting(id);
    const db = await createClient();
    check(await db.from("profiles").update({ status: "active" }).eq("id", id).select("id"));
    check(
      await db
        .from("learner_requests")
        .update({
          status: "approved",
          trial_ends_at: null,
          decided_by: actor.real.id,
          decided_at: new Date().toISOString(),
        })
        .eq("user_id", id)
        .select("user_id"),
    );
    await db.rpc("log_audit", {
      p_action: "learner.approve",
      p_target_table: "profiles",
      p_target_id: id,
      p_school: learner.school_id ?? undefined,
    });
    if (learner.email) {
      const locale = learner.locale === "ar" ? "ar" : "en";
      const url = `${serverEnv().NEXT_PUBLIC_APP_URL}/${locale}/learner`;
      // The approval stands even if the email can't be sent.
      await (
        await getMailer()
      )
        .send(approvedEmail(learner.email, url, locale))
        .catch(() => undefined);
    }
    refresh();
  });
}

/** Give a waiting learner a free trial: in now, and waiting for approval again when it ends. */
export async function startTrial(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const id = idOf(form);
    await owner("users:edit");
    const learner = await waiting(id);
    const db = await createClient();
    const ends = trialEnd();
    check(await db.from("profiles").update({ status: "active" }).eq("id", id).select("id"));
    check(
      await db
        .from("learner_requests")
        .update({ trial_ends_at: ends })
        .eq("user_id", id)
        .select("user_id"),
    );
    await createAdminClient().auth.admin.updateUserById(id, { ban_duration: "none" });
    await db.rpc("log_audit", {
      p_action: "learner.trial",
      p_target_table: "profiles",
      p_target_id: id,
      p_school: learner.school_id ?? undefined,
      p_details: { ends },
    });
    if (learner.email) {
      const locale = learner.locale === "ar" ? "ar" : "en";
      const url = `${serverEnv().NEXT_PUBLIC_APP_URL}/${locale}/learner`;
      await (
        await getMailer()
      )
        .send(approvedEmail(learner.email, url, locale))
        .catch(() => undefined);
    }
    refresh();
  });
}

/** Turn a waiting request down: the account and everything in it are deleted. */
export async function rejectLearner(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const id = idOf(form);
    await owner("users:edit");
    const learner = await waiting(id); // only ever a pending general learner, never anyone else
    const db = await createClient();
    check(
      await db.rpc("log_audit", {
        p_action: "learner.reject",
        p_target_table: "profiles",
        p_target_id: id,
        p_school: learner.school_id ?? undefined,
      }),
    );
    const { error } = await createAdminClient().auth.admin.deleteUser(id);
    if (error) throw new ActionError("failed");
    refresh();
  });
}

/** Letters and digits that can't be mistaken for one another when read aloud or copied. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () =>
  Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export async function createInvite(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = inviteSchema.parse(Object.fromEntries(form.entries()));
    const actor = await owner("users:invite");
    const db = await createClient();
    check(
      await db.from("learner_invites").insert({
        code: newCode(),
        label: input.label,
        max_uses: input.max_uses,
        // Valid through the whole of that day, school time or later.
        expires_at: input.expires_on ? `${input.expires_on}T23:59:59Z` : null,
        created_by: actor.real.id,
      }),
    );
    refresh();
  });
}

export async function cancelInvite(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const id = idOf(form);
    await owner("users:invite");
    const db = await createClient();
    const { data } = check(
      await db.from("learner_invites").update({ status: "cancelled" }).eq("id", id).select("id"),
    );
    if (!data?.length) throw new ActionError("notFound");
    refresh();
  });
}
