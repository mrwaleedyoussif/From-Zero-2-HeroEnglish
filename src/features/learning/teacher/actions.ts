"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { classTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { classAbilities, roster } from "./queries";
import { makeTeams } from "./teams";

async function onClass(perm: string, classId: string) {
  const actor = await getActor();
  if (!actor) throw new ActionError("signedOut");
  const target = await classTarget(classId);
  await assertCanWrite(actor, perm, target);
  return { actor, schoolId: target.school ?? "", db: await createClient() };
}
const done = () => revalidatePath("/[locale]/teacher", "layout");
const fields = (form: FormData) => Object.fromEntries(form.entries());

export async function createSet(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = z
      .object({
        class_id: z.guid(),
        name: z.string().trim().min(1).max(60),
        kind: z.enum(["group", "team"]),
      })
      .parse(fields(form));
    const { actor, schoolId, db } = await onClass("students:edit", i.class_id);
    const row = {
      school_id: schoolId,
      class_id: i.class_id,
      name: i.name,
      created_by: actor.real.id,
    };
    check(
      await (i.kind === "group" ? db.from("groups").insert(row) : db.from("teams").insert(row)),
    );
    done();
  });
}

const memberInput = z.object({
  class_id: z.guid(),
  kind: z.enum(["group", "team"]),
  set_id: z.guid(),
  student_id: z.guid(),
});

export async function addMember(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = memberInput.parse(fields(form));
    const { db } = await onClass("students:edit", i.class_id);
    check(
      await (i.kind === "group"
        ? db.from("group_members").insert({ group_id: i.set_id, student_id: i.student_id })
        : db.from("team_members").insert({ team_id: i.set_id, student_id: i.student_id })),
    );
    done();
  });
}

export async function removeMember(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = memberInput.parse(fields(form));
    const { db } = await onClass("students:edit", i.class_id);
    check(
      await (i.kind === "group"
        ? db.from("group_members").delete().eq("group_id", i.set_id).eq("student_id", i.student_id)
        : db.from("team_members").delete().eq("team_id", i.set_id).eq("student_id", i.student_id)),
    );
    done();
  });
}

export async function deleteSet(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = z
      .object({ class_id: z.guid(), kind: z.enum(["group", "team"]), set_id: z.guid() })
      .parse(fields(form));
    const { db } = await onClass("students:edit", i.class_id);
    check(
      await db
        .from(i.kind === "group" ? "groups" : "teams")
        .delete()
        .eq("id", i.set_id)
        .eq("class_id", i.class_id),
    );
    done();
  });
}

/** Build mixed-ability teams of ~4 for a class that has none yet. */
export async function autoTeams(_p: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const i = z.object({ class_id: z.guid() }).parse(fields(form));
    const { actor, schoolId, db } = await onClass("students:edit", i.class_id);
    const { count } = await db
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("class_id", i.class_id);
    if (count) throw new ActionError("teamsExist");
    const students = await roster(i.class_id);
    const abilities = await classAbilities(students.map((s) => s.id));
    const theta = (id: string) => {
      const r = abilities.find((a) => a.student_id === id && a.skill_id === null);
      return r ? Number(r.theta) : null;
    };
    const teams = makeTeams(students.map((s) => ({ id: s.id, theta: theta(s.id) })));
    for (const [n, members] of teams.entries()) {
      const { data } = check(
        await db
          .from("teams")
          .insert({
            school_id: schoolId,
            class_id: i.class_id,
            name: `Team ${n + 1}`,
            created_by: actor.real.id,
          })
          .select("id")
          .single(),
      );
      if (!data) throw new ActionError("failed");
      check(
        await db
          .from("team_members")
          .insert(members.map((student_id) => ({ team_id: data.id, student_id }))),
      );
    }
    done();
  });
}
