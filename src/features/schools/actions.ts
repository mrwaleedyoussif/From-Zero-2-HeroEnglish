"use server";

import { revalidatePath } from "next/cache";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget, schoolTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { classSchema, formObject, gradeSchema, schoolSchema, yearSchema } from "./schema";

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
    check(await supabase.from("schools").insert(input));
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
    const input = gradeSchema.parse(formObject(form));
    await assertCanWrite(await actor(), "classes:manage", schoolTarget(input.school_id));
    const supabase = await createClient();
    check(await supabase.from("grades").insert({ ...input, code: input.code.toUpperCase() }));
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
