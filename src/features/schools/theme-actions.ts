"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { schoolTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/db";
import { schoolTheme } from "@/lib/theme/contrast";

const input = z.object({
  school_id: z.guid(),
  primary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .or(z.literal("")),
});

/** Set (or clear, with "") a school's primary colour. Refuses colours that fail WCAG AA. */
export async function updateSchoolTheme(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { school_id, primary } = input.parse(Object.fromEntries(form.entries()));
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    await assertCanWrite(actor, "schools:manage", schoolTarget(school_id));
    if (primary && !schoolTheme(primary).ok) throw new ActionError("lowContrast");
    const db = await createClient();
    const { data: school } = await db.from("schools").select("theme").eq("id", school_id).single();
    const theme: { [key: string]: Json | undefined } = {
      ...((school?.theme as { [key: string]: Json | undefined } | null) ?? {}),
    };
    if (primary) theme.primary = primary.toLowerCase();
    else delete theme.primary;
    check(await db.from("schools").update({ theme }).eq("id", school_id));
    revalidatePath("/[locale]", "layout");
  });
}
