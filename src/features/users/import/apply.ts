import "server-only";
import { ActionError, check } from "@/lib/action-result";
import type { Scope } from "@/lib/auth/engine";
import type { createClient } from "@/lib/supabase/server";
import { grantRole, provisionStaff, provisionStudent } from "../provision";
import { schoolYear } from "./names";
import type { ImportContext, PlannedRow } from "./resolve";

type Db = Awaited<ReturnType<typeof createClient>>;

export interface ImportOutcome {
  line: number;
  fullName: string;
  ok: boolean;
  error?: string;
  /** People who sign in with a PIN: credentials, shown once. */
  schoolCode?: string;
  username?: string;
  pin?: string;
  classCode?: string;
}

/** Creates missing grades/classes on first use and caches their ids. */
function structureCache(db: Db, ctx: ImportContext) {
  return {
    async grade(schoolId: string, code: string): Promise<string> {
      const key = `${schoolId}/${code}`;
      const hit = ctx.grade.get(key);
      if (hit) return hit.id;
      const { data } = check(
        await db
          .from("grades")
          .insert({
            school_id: schoolId,
            code,
            name_en: `Grade ${code}`,
            name_ar: `الصف ${code}`,
            sort_order: Number(code) || 0,
          })
          .select("id, code, school_id")
          .single(),
      );
      if (!data) throw new ActionError("failed");
      ctx.grade.set(key, data);
      return data.id;
    },
    async klass(schoolId: string, gradeCode: string, code: string): Promise<string> {
      const key = `${schoolId}/${code}`;
      const hit = ctx.klass.get(key);
      if (hit) return hit.id;
      const year = ctx.year.get(schoolId);
      if (!year) throw new ActionError("noCurrentYear");
      const gradeId = await this.grade(schoolId, gradeCode);
      const { data } = check(
        await db
          .from("classes")
          .insert({ school_id: schoolId, grade_id: gradeId, year_id: year.id, code })
          .select("id, code, grade_id, year_id, school_id")
          .single(),
      );
      if (!data) throw new ActionError("failed");
      ctx.klass.set(key, { ...data, academic_years: { is_current: true } });
      return data.id;
    },
  };
}

/** A school the file names but the app does not have yet: made with its current school year. */
async function newSchool(db: Db, ctx: ImportContext, code: string, name: string) {
  const { data: school } = check(
    await db
      .from("schools")
      .insert({ code, name_en: name, name_ar: name })
      .select("id, code")
      .single(),
  );
  if (!school) throw new ActionError("failed");
  const { data: year } = check(
    await db
      .from("academic_years")
      .insert({ school_id: school.id, ...schoolYear(), is_current: true })
      .select("id, school_id")
      .single(),
  );
  if (!year) throw new ActionError("failed");
  ctx.school.set(code, school);
  ctx.year.set(school.id, year);
  return school;
}

/** Apply "create" rows one by one; a failing row is reported and the rest continue. */
export async function applyPlan(
  db: Db,
  ctx: ImportContext,
  rows: PlannedRow[],
): Promise<ImportOutcome[]> {
  const structure = structureCache(db, ctx);
  const outcomes: ImportOutcome[] = [];
  for (const row of rows) {
    if (row.status !== "create" || !row.data) continue;
    const d = row.data;
    const role = ctx.role.get(d.role);
    if (!role) continue;
    try {
      const school =
        ctx.school.get(d.school_code) ??
        (await newSchool(db, ctx, d.school_code, d.school_name ?? d.school_code));
      const classId =
        d.class && row.grade ? await structure.klass(school.id, row.grade, d.class) : undefined;
      let scope: Scope = { type: "school", id: school.id };
      if (role.default_scope_type === "class" && classId) scope = { type: "class", id: classId };
      if (role.default_scope_type === "grade" && row.grade)
        scope = { type: "grade", id: await structure.grade(school.id, row.grade) };
      if (row.username) {
        const { pin } = await provisionStudent(db, {
          schoolId: school.id,
          schoolCode: school.code,
          classId: row.isStudent ? classId : undefined,
          fullName: d.full_name,
          username: row.username,
          consent: d.consent,
          studentRoleId: role.id,
          locale: d.language,
          staffScope: row.isStudent ? undefined : scope,
        });
        outcomes.push({
          line: row.line,
          fullName: d.full_name,
          ok: true,
          schoolCode: school.code,
          username: row.username,
          pin,
          classCode: d.class,
        });
      } else {
        await provisionStaff(
          db,
          {
            email: d.email ?? "",
            fullName: d.full_name,
            schoolId: school.id,
            locale: d.language ?? "en",
            sendInvite: false, // no email burst; staff sign in from the login page
          },
          (id) => grantRole(db, id, role.id, scope, true),
        );
        outcomes.push({ line: row.line, fullName: d.full_name, ok: true });
      }
    } catch (e) {
      outcomes.push({
        line: row.line,
        fullName: d.full_name,
        ok: false,
        error: e instanceof ActionError ? e.key : "failed",
      });
    }
  }
  return outcomes;
}
