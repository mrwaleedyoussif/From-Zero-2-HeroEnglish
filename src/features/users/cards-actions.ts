"use server";

import { z } from "zod";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { classTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { LoginCard } from "./import/login-cards-grid";
import { setPin } from "./provision";

/**
 * New PINs for every active student in a class, returned once for printing.
 * PINs are stored hashed by Supabase Auth, so cards can only be printed when PINs are (re)set.
 */
export async function generateClassCards(
  _p: unknown,
  form: FormData,
): Promise<ActionResult<LoginCard[]>> {
  return runAction(async () => {
    const classId = z.guid().parse(form.get("class_id"));
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    await assertCanWrite(actor, "users:reset_pin", await classTarget(classId));
    const db = await createClient();
    const { data: cls } = await db
      .from("classes")
      .select("code, school_id, schools(code)")
      .eq("id", classId)
      .single();
    if (!cls) throw new ActionError("forbidden");
    const { data: students } = check(
      await db
        .from("enrolments")
        .select("profiles!inner(id, full_name, username, status)")
        .eq("class_id", classId)
        .eq("status", "active")
        .eq("profiles.status", "active"),
    );
    const cards: LoginCard[] = [];
    for (const row of students ?? []) {
      const p = row.profiles;
      if (!p?.username) continue;
      cards.push({
        fullName: p.full_name,
        schoolCode: cls.schools?.code ?? "",
        username: p.username,
        pin: await setPin(p.id),
        classCode: cls.code,
      });
    }
    await db.rpc("log_audit", {
      p_action: "pin.reset_class",
      p_target_table: "classes",
      p_target_id: classId,
      p_school: cls.school_id,
      p_details: { students: cards.length },
    });
    return cards.sort((a, b) => a.fullName.localeCompare(b.fullName));
  });
}
