"use server";

import { revalidatePath } from "next/cache";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget, schoolTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { suggestUsername } from "@/lib/auth/student-identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_ROLE_KEY } from "./config";
import { grantRole, provisionStaff, provisionStudent, roleIdByKey, setPin } from "./provision";
import { createStudentSchema, inviteStaffSchema, userIdSchema } from "./schema";

const form2obj = (f: FormData) => Object.fromEntries(f.entries());

async function actor() {
  const a = await getActor();
  if (!a) throw new ActionError("signedOut");
  return a;
}

export async function inviteStaff(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const input = inviteStaffSchema.parse(form2obj(form));
    const target = input.school_id ? schoolTarget(input.school_id) : platformTarget;
    const a = await actor();
    await assertCanWrite(a, "users:invite", target);
    await assertCanWrite(a, "roles:assign", target);
    const db = await createClient();
    await provisionStaff(
      db,
      {
        email: input.email,
        fullName: input.full_name,
        schoolId: input.school_id ?? null,
        locale: input.locale,
        sendInvite: true,
      },
      (id) => grantRole(db, id, input.role_id, input.scope, true),
    );
    revalidatePath("/[locale]/owner/users", "page");
  });
}

export async function createStudent(
  _p: unknown,
  form: FormData,
): Promise<ActionResult<{ username: string; pin: string }>> {
  return runAction(async () => {
    const input = createStudentSchema.parse(form2obj(form));
    const a = await actor();
    await assertCanWrite(a, "users:create", schoolTarget(input.school_id));
    const db = await createClient();
    const { data: school } = await db
      .from("schools")
      .select("code")
      .eq("id", input.school_id)
      .single();
    if (!school) throw new ActionError("forbidden");
    const username = input.username ?? suggestUsername(input.full_name);
    if (!username) throw new ActionError("usernameNeeded");
    const { pin } = await provisionStudent(db, {
      schoolId: input.school_id,
      schoolCode: school.code,
      classId: input.class_id,
      fullName: input.full_name,
      username,
      consent: input.consent,
      studentRoleId: await roleIdByKey(db, STUDENT_ROLE_KEY),
    });
    revalidatePath("/[locale]/owner/users", "page");
    return { username, pin };
  });
}

/** New random PIN for a student; shown once to the person resetting it. */
export async function resetPin(
  _p: unknown,
  form: FormData,
): Promise<ActionResult<{ pin: string }>> {
  return runAction(async () => {
    const { user_id } = userIdSchema.parse(form2obj(form));
    await assertCanWrite(await actor(), "users:reset_pin", { userId: user_id });
    const db = await createClient();
    const { data: p } = await db
      .from("profiles")
      .select("kind, school_id")
      .eq("id", user_id)
      .single();
    if (p?.kind !== "student") throw new ActionError("studentsOnly");
    const pin = await setPin(user_id);
    await db.rpc("log_audit", {
      p_action: "pin.reset",
      p_target_table: "profiles",
      p_target_id: user_id,
      p_school: p.school_id ?? undefined,
    });
    return { pin };
  });
}

export async function setUserStatus(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user_id } = userIdSchema.parse(form2obj(form));
    const status = form.get("status") === "disabled" ? "disabled" : "active";
    const a = await actor();
    if (user_id === a.real.id) throw new ActionError("notYourself");
    await assertCanWrite(a, "users:disable", { userId: user_id });
    const db = await createClient();
    const { data } = check(
      await db.from("profiles").update({ status }).eq("id", user_id).select("school_id").single(),
    );
    // Also block sign-in at the Auth level (disabled users already see no data via RLS).
    await createAdminClient().auth.admin.updateUserById(user_id, {
      ban_duration: status === "disabled" ? "876000h" : "none",
    });
    await db.rpc("log_audit", {
      p_action: `user.${status === "disabled" ? "disable" : "enable"}`,
      p_target_table: "profiles",
      p_target_id: user_id,
      p_school: data?.school_id ?? undefined,
    });
    revalidatePath("/[locale]/owner/users/[id]", "page");
  });
}
