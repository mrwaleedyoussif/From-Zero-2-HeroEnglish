"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { classTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { award } from "./award";

async function actor() {
  const a = await getActor();
  if (!a) throw new ActionError("signedOut");
  return a;
}
const fields = (f: FormData) => Object.fromEntries(f.entries());
const done = () => revalidatePath("/[locale]", "layout");

/** A learner spends coins (the DB function checks the balance atomically). */
export async function redeem(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { item_id } = z.object({ item_id: z.guid() }).parse(fields(form));
    const a = await actor();
    await assertCanWrite(a, "rewards:view", { userId: a.real.id });
    const db = await createClient();
    const { error } = await db.rpc("redeem_item", { p_item: item_id });
    if (error)
      throw new ActionError(error.message.includes("not enough") ? "notEnoughCoins" : "failed");
    done();
    return undefined;
  });
}

/** Teacher kudos: XP for a learner (capped per day by the kudos rule) and a notification. */
export async function giveKudos(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { student_id } = z.object({ student_id: z.guid() }).parse(fields(form));
    const a = await actor();
    await assertCanWrite(a, "rewards:grant", { userId: student_id });
    const admin = createAdminClient();
    const outcome = await award(admin, {
      studentId: student_id,
      type: "kudos",
      sourceKey: `${a.real.id}:${Date.now()}`,
      meta: { from: a.real.id },
    });
    if (outcome.xp === 0) throw new ActionError("kudosCap");
    await admin.from("notifications").insert({
      user_id: student_id,
      kind: "kudos",
      params: { from: a.real.full_name },
      href: "/student/rewards",
    });
    done();
  });
}

/** Team challenge points (RallyCoach, Numbered Heads…): team points + XP for each member. */
export async function awardTeam(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = z
      .object({
        class_id: z.guid(),
        team_id: z.guid(),
        points: z.coerce.number().int().min(1).max(100),
        reason: z.string().trim().max(120).optional(),
      })
      .parse(fields(form));
    const a = await actor();
    const target = await classTarget(i.class_id);
    await assertCanWrite(a, "rewards:grant", target);
    const db = await createClient();
    const { data: row, error } = await db
      .from("team_xp")
      .insert({
        team_id: i.team_id,
        school_id: target.school ?? "",
        points: i.points,
        reason: i.reason || null,
        awarded_by: a.real.id,
      })
      .select("id, teams!inner(class_id, team_members(student_id))")
      .single();
    if (error || !row || row.teams.class_id !== i.class_id) throw new ActionError("forbidden");
    const admin = createAdminClient();
    for (const m of row.teams.team_members)
      await award(admin, { studentId: m.student_id, type: "team_challenge", sourceKey: row.id });
    done();
  });
}

export async function decideRedemption(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = z.object({ id: z.guid(), approve: z.enum(["yes", "no"]) }).parse(fields(form));
    const a = await actor();
    if (a.viewAs) throw new ActionError("readOnly");
    const db = await createClient();
    const { error } = await db.rpc("decide_redemption", {
      p_id: i.id,
      p_approve: i.approve === "yes",
    });
    if (error) throw new ActionError(error.code === "42501" ? "forbidden" : "duplicate");
    done();
    return undefined;
  });
}

/** Switch the class (and team) leaderboard on or off (SPEC §10). Audited by trigger. */
export async function setLeaderboard(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = z.object({ class_id: z.guid(), enabled: z.enum(["on", "off"]) }).parse(fields(form));
    const a = await actor();
    const target = await classTarget(i.class_id);
    await assertCanWrite(a, "rewards:grant", target);
    const db = await createClient();
    const { error } = await db.from("class_reward_settings").upsert({
      class_id: i.class_id,
      school_id: target.school ?? "",
      leaderboard_enabled: i.enabled === "on",
      updated_by: a.real.id,
    });
    if (error) throw new ActionError("forbidden");
    done();
  });
}
