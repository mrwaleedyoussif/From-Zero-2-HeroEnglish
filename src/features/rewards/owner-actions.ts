"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EVENT_TYPES } from "./engine/rules";

/** Reward data is platform reference data: the Owner (content:import on the platform) edits it. */
async function owner() {
  const a = await getActor();
  if (!a) throw new ActionError("signedOut");
  await assertCanWrite(a, "content:import", platformTarget);
  return createClient();
}
const fields = (f: FormData) => Object.fromEntries(f.entries());
const optInt = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.coerce.number().int().min(0).max(max).nullable(),
  );
const done = () => revalidatePath("/[locale]", "layout");

export async function saveRule(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = z
      .object({
        event_type: z.enum(EVENT_TYPES),
        xp: z.coerce.number().int().min(0).max(10000),
        coins: z.coerce.number().int().min(0).max(10000),
        min_seconds: optInt(36000),
        min_accuracy: optInt(100),
        daily_cap: optInt(100000),
        scale: z.enum(["none", "level", "accuracy"]),
        active: z.enum(["on", "off"]).transform((v) => v === "on"),
      })
      .parse({ active: "off", ...fields(form) });
    const db = await owner();
    check(await db.from("reward_rules").upsert({ ...i, daily_cap: i.daily_cap || null }));
    done();
  });
}

export async function saveLevel(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = z
      .object({
        level: z.coerce.number().int().min(1).max(100),
        name_en: z.string().trim().min(1).max(40),
        name_ar: z.string().trim().min(1).max(40),
        xp_required: z.coerce.number().int().min(0).max(10_000_000),
      })
      .parse(fields(form));
    const db = await owner();
    check(await db.from("levels").upsert(i));
    done();
  });
}

export async function addCatalogItem(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = z
      .object({
        code: z
          .string()
          .trim()
          .regex(/^[a-z0-9-]{2,40}$/),
        name_en: z.string().trim().min(1).max(60),
        name_ar: z.string().trim().min(1).max(60),
        emoji: z.string().trim().max(8).optional(),
        kind: z.enum(["cosmetic", "real"]),
        cost: z.coerce.number().int().min(1).max(100000),
      })
      .parse(fields(form));
    const db = await owner();
    check(
      await db.from("reward_catalog").insert({
        ...i,
        emoji: i.emoji || null,
        school_id: null,
        needs_approval: i.kind === "real",
      }),
    );
    done();
  });
}

export async function retireCatalogItem(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { id } = z.object({ id: z.guid() }).parse(fields(form));
    const db = await owner();
    check(
      await db
        .from("reward_catalog")
        .update({ status: "retired" })
        .eq("id", id)
        .is("school_id", null),
    );
    done();
  });
}
