"use server";

import { revalidatePath } from "next/cache";
import { schoolYear } from "@/features/users/import/names";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget, schoolTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  classSchema,
  formObject,
  GRADE_CODE,
  gradeRangeSchema,
  gradeRows,
  gradeSchema,
  schoolSchema,
  yearSchema,
} from "./schema";

async function actor() {
  const a = await getActor();
  if (!a) throw new ActionError("signedOut");
  return a;
}

export async function createSchool(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = schoolSchema.parse(formObject(form));
    await assertCanWrite(await actor(), "schools:manage", platformTarget);
    const supabase = await createClient();
    const { data: school } = check(
      await supabase.from("schools").insert(input).select("id").single(),
    );
    // A new school starts with its current school year, so classes can be added at once.
    if (school)
      check(
        await supabase
          .from("academic_years")
          .insert({ school_id: school.id, ...schoolYear(), is_current: true }),
      );
    revalidatePath("/[locale]/owner/schools", "page");
  });
}

export async function updateSchool(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const id = String(form.get("id"));
    const input = schoolSchema.parse(formObject(form));
    await assertCanWrite(await actor(), "schools:manage", schoolTarget(id));
    const supabase = await createClient();
    check(await supabase.from("schools").update(input).eq("id", id));
    revalidatePath("/[locale]/owner/schools", "layout");
  });
}

export async function createYear(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = yearSchema.parse(formObject(form));
    await assertCanWrite(await actor(), "classes:manage", schoolTarget(input.school_id));
    const supabase = await createClient();
    if (input.is_current) {
      check(
        await supabase
          .from("academic_years")
          .update({ is_current: false })
          .eq("school_id", input.school_id),
      );
    }
    check(await supabase.from("academic_years").insert(input));
    revalidatePath("/[locale]/owner/schools/[id]", "page");
  });
}

export async function createGrade(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    // The usual slip is a long code ("Grade 4"): say exactly what a code is.
    if (!GRADE_CODE.test(String(form.get("code") ?? "").trim())) throw new ActionError("gradeCode");
    const input = gradeSchema.parse(formObject(form));
    await assertCanWrite(await actor(), "classes:manage", schoolTarget(input.school_id));
    const supabase = await createClient();
    check(await supabase.from("grades").insert({ ...input, code: input.code.toUpperCase() }));
    revalidatePath("/[locale]/owner/schools/[id]", "page");
  });
}

/** Several grades at once; ones the school already has are left as they are. */
export async function createGradeRange(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = gradeRangeSchema.parse(formObject(form));
    await assertCanWrite(await actor(), "classes:manage", schoolTarget(input.school_id));
    const supabase = await createClient();
    check(
      await supabase
        .from("grades")
        .upsert(gradeRows(input), { onConflict: "school_id,code", ignoreDuplicates: true }),
    );
    revalidatePath("/[locale]/owner/schools/[id]", "page");
  });
}

export async function createClass(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = classSchema.parse(formObject(form));
    await assertCanWrite(await actor(), "classes:manage", schoolTarget(input.school_id));
    const supabase = await createClient();
    check(await supabase.from("classes").insert({ ...input, code: input.code.toUpperCase() }));
    revalidatePath("/[locale]/owner/schools/[id]", "page");
  });
}
