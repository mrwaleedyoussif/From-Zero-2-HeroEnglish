"use server";

import { revalidatePath } from "next/cache";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { getActor } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { profileOptions } from "./queries";
import { mindsetScore, onlyKnown, profileInput } from "./schema";

/** Save the onboarding wizard (or a later edit). The learner writes only their own profile. */
export async function saveProfile(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    await assertCanWrite(actor, "learning:self", { userId: actor.real.id });
    const p = profileInput.parse(input);
    const options = await profileOptions();
    const keysOf = (kind: string) =>
      new Set(options.filter((o) => o.kind === kind).map((o) => o.key));
    const statements = options.filter((o) => o.kind === "mindset");
    const mindset = Object.fromEntries(
      Object.entries(p.mindset_answers).filter(([k]) => statements.some((s) => s.key === k)),
    );
    const db = await createClient();
    const { data: me } = await db
      .from("profiles")
      .select("school_id")
      .eq("id", actor.real.id)
      .single();
    if (!me?.school_id) throw new ActionError("notFound");
    check(
      await db.from("learner_profiles").upsert({
        student_id: actor.real.id,
        school_id: me.school_id,
        interests: onlyKnown(p.interests, keysOf("interest")),
        goals: onlyKnown(p.goals, keysOf("goal")),
        preferred_formats: onlyKnown(p.preferred_formats, keysOf("format")),
        accommodations: onlyKnown(p.accommodations, keysOf("accommodation")),
        mindset_answers: mindset,
        mindset_score: mindsetScore(mindset, statements),
        language_background: p.language_background || null,
        onboarded_at: new Date().toISOString(),
      }),
    );
    // Preferences changed: drop today's cached suggestions so they are recomputed.
    // (Server-written cache: students have no write access to it.)
    await createAdminClient().from("recommendations").delete().eq("student_id", actor.real.id);
    revalidatePath("/[locale]/student", "layout");
  });
}
