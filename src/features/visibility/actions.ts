"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { isKnownKey } from "@/lib/registry";
import { createClient } from "@/lib/supabase/server";
import { findUser } from "./queries";
import { ruleSchema, subjectSchema } from "./schema";

async function authorize() {
  const actor = await getActor();
  if (!actor) throw new ActionError("signedOut");
  await assertCanWrite(actor, "visibility:manage", platformTarget);
  return createClient();
}

const revalidate = () => revalidatePath("/[locale]/owner/visibility", "page");
const knownKey = z.string().refine(isKnownKey);

/** Show/hide a key for one subject. Audited by trigger; takes effect on the next page load. */
export async function addRule(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = ruleSchema.parse(Object.fromEntries(form.entries()));
    knownKey.parse(input.target_key);
    const db = await authorize();
    let subject = input.subject;
    if (subject.type === "user") {
      const user = await findUser(input.user ?? "");
      if (!user) throw new ActionError("userNotFound");
      subject = { type: "user", id: user.id };
    }
    check(
      await db.from("visibility_rules").insert({
        target_key: input.target_key,
        subject_type: subject.type,
        subject_id: subject.id,
        effect: input.effect,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        note: input.note || null,
      }),
    );
    revalidate();
  });
}

export async function removeRule(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const id = z.guid().parse(form.get("id"));
    const db = await authorize();
    const { data } = check(await db.from("visibility_rules").delete().eq("id", id).select("id"));
    if (!data?.length) throw new ActionError("forbidden");
    revalidate();
  });
}

const flagSchema = z.object({
  key: knownKey,
  enabled: z.enum(["true", "false"]).transform((v) => v === "true"),
  rollout: z.enum(["all", "list"]),
});

/** Create or update a feature flag (enabled + rollout). */
export async function saveFlag(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = flagSchema.parse(Object.fromEntries(form.entries()));
    const db = await authorize();
    check(await db.from("feature_flags").upsert(input, { onConflict: "key" }));
    revalidate();
  });
}

/** Add or remove one subject in a "list" rollout. */
export async function setFlagSubject(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const key = knownKey.parse(form.get("key"));
    const subject = subjectSchema.parse(form.get("subject"));
    const remove = form.get("remove") === "true";
    const db = await authorize();
    const { data: flag } = await db
      .from("feature_flags")
      .select("subjects")
      .eq("key", key)
      .maybeSingle();
    const current = Array.isArray(flag?.subjects)
      ? (flag.subjects as { type: string; id: string }[])
      : [];
    const rest = current.filter((s) => !(s.type === subject.type && s.id === subject.id));
    const subjects = remove ? rest : [...rest, { type: subject.type, id: subject.id ?? "" }];
    check(
      await db
        .from("feature_flags")
        .upsert({ key, subjects, rollout: "list", enabled: true }, { onConflict: "key" }),
    );
    revalidate();
  });
}
