"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { classTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { thetaForCefr } from "../engine/score";
import { CEFR } from "@/features/content/import/fields";
import { loadCuts } from "../runtime/data";

async function actor() {
  const a = await getActor();
  if (!a) throw new ActionError("signedOut");
  return a;
}
const revalidate = () => revalidatePath("/[locale]/teacher/placement", "layout");

/** A teacher's rubric score for a writing/speaking answer; it joins the student's ability history. */
export async function scoreSubmission(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const entries = Object.fromEntries(form.entries());
    const input = z
      .object({
        submission_id: z.guid(),
        rubric_id: z.guid().optional(),
        cefr: z.enum(CEFR),
        comment: z.string().trim().max(1000).optional(),
      })
      .parse(entries);
    const scores = Object.fromEntries(
      Object.entries(entries)
        .filter(([k]) => k.startsWith("c_"))
        .map(([k, v]) => [k.slice(2), z.enum(CEFR).parse(v)]),
    );
    const db = await createClient();
    const { data: sub } = await db
      .from("productive_submissions")
      .select(
        "id, student_id, school_id, skill_id, session_id, status, test_sessions(department_id)",
      )
      .eq("id", input.submission_id)
      .single();
    if (!sub) throw new ActionError("notFound");
    if (sub.status === "scored") throw new ActionError("duplicate");
    const a = await actor();
    await assertCanWrite(a, "placement:score", { userId: sub.student_id });
    check(
      await db.from("submission_scores").insert({
        submission_id: sub.id,
        scorer_id: a.real.id,
        rubric_id: input.rubric_id ?? null,
        scores,
        cefr: input.cefr,
        comment: input.comment || null,
        school_id: sub.school_id,
      }),
    );
    // Results tables are written by the server only (students can't touch them).
    const admin = createAdminClient();
    const departmentId = sub.test_sessions?.department_id ?? "";
    const theta = thetaForCefr(input.cefr, await loadCuts(admin, departmentId));
    await admin.from("productive_submissions").update({ status: "scored" }).eq("id", sub.id);
    if (theta !== null) {
      await admin.from("ability_estimates").insert({
        student_id: sub.student_id,
        school_id: sub.school_id,
        department_id: departmentId,
        skill_id: sub.skill_id,
        theta,
        cefr: input.cefr,
        source: "rubric",
        session_id: sub.session_id,
      });
    }
    revalidate();
  });
}

export async function grantRetake(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = z
      .object({
        student_id: z.guid(),
        department_id: z.guid(),
        reason: z.string().trim().max(200).optional(),
      })
      .parse(Object.fromEntries(form.entries()));
    const a = await actor();
    await assertCanWrite(a, "placement:retake", { userId: input.student_id });
    const db = await createClient();
    const { data: p } = await db
      .from("profiles")
      .select("school_id")
      .eq("id", input.student_id)
      .single();
    if (!p?.school_id) throw new ActionError("notFound");
    check(
      await db.from("placement_retakes").insert({
        ...input,
        reason: input.reason || null,
        school_id: p.school_id,
        granted_by: a.real.id,
      }),
    );
    revalidate();
  });
}

/** Open a progress check (short adaptive test) for a class until a date (SPEC §7). */
export async function openWindow(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = z
      .object({ class_id: z.guid(), department_id: z.guid(), closes_on: z.iso.date() })
      .parse(Object.fromEntries(form.entries()));
    const a = await actor();
    const target = await classTarget(input.class_id);
    await assertCanWrite(a, "placement:retake", target);
    const closes = new Date(`${input.closes_on}T23:59:59Z`);
    if (closes <= new Date()) throw new ActionError("invalid");
    const db = await createClient();
    check(
      await db.from("placement_windows").insert({
        class_id: input.class_id,
        department_id: input.department_id,
        school_id: target.school ?? "",
        closes_at: closes.toISOString(),
        created_by: a.real.id,
      }),
    );
    revalidate();
  });
}
