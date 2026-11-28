import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { gradeOfClass, repairFilledCodes, usernameFor } from "./names";
import { type ImportRow, parseImportCsv } from "./parse";

type Db = Awaited<ReturnType<typeof createClient>>;

export interface PlannedRow {
  line: number;
  status: "create" | "exists" | "error";
  errors: string[];
  /** e.g. "newClass:4C", "newGrade:4" */
  notes: string[];
  fullName: string;
  login: string;
  schoolCode: string;
  roleKey: string;
  classCode?: string;
  data?: ImportRow;
  isStudent?: boolean;
  /** Signs in with school code + username + PIN (students, and staff without an email). */
  username?: string;
  grade?: string;
}

export interface ImportPlan {
  rows: PlannedRow[];
  fileErrors: string[];
  counts: { create: number; exists: number; error: number };
}

/** Everything the plan needs, loaded once (RLS limits it to what the caller may see). */
async function loadContext(db: Db, rows: ImportRow[]) {
  const codes = [...new Set(rows.map((r) => r.school_code))];
  const roleKeys = [...new Set(rows.map((r) => r.role))];
  const { data: schools } = await db
    .from("schools")
    .select("id, code")
    .in("code", codes.length ? codes : ["-"]);
  const schoolIds = (schools ?? []).map((s) => s.id);
  const ids = schoolIds.length ? schoolIds : ["00000000-0000-0000-0000-000000000000"];
  const [roles, grades, classes, years, profiles] = await Promise.all([
    db
      .from("roles")
      .select("id, key, default_scope_type, status")
      .in("key", roleKeys.length ? roleKeys : ["-"]),
    db.from("grades").select("id, code, school_id").in("school_id", ids),
    db
      .from("classes")
      .select("id, code, grade_id, year_id, school_id, academic_years!inner(is_current)")
      .in("school_id", ids)
      .eq("academic_years.is_current", true),
    db.from("academic_years").select("id, school_id").in("school_id", ids).eq("is_current", true),
    db.from("profiles").select("username, email, full_name, school_id").in("school_id", ids),
  ]);
  const gradeCode = new Map((grades.data ?? []).map((g) => [g.id, g.code]));
  return {
    school: new Map((schools ?? []).map((s) => [s.code, s])),
    role: new Map((roles.data ?? []).map((r) => [r.key, r])),
    grade: new Map((grades.data ?? []).map((g) => [`${g.school_id}/${g.code}`, g])),
    klass: new Map((classes.data ?? []).map((c) => [`${c.school_id}/${c.code}`, c])),
    gradeOf: new Map(
      (classes.data ?? []).map((c) => [`${c.school_id}/${c.code}`, gradeCode.get(c.grade_id)]),
    ),
    names: new Set(
      (profiles.data ?? []).map((p) => `${p.school_id}/${p.full_name.trim().toLowerCase()}`),
    ),
    year: new Map((years.data ?? []).map((y) => [y.school_id, y])),
    usernames: new Set(
      (profiles.data ?? []).flatMap((p) => (p.username ? [`${p.school_id}/${p.username}`] : [])),
    ),
    emails: new Set((profiles.data ?? []).flatMap((p) => (p.email ? [p.email.toLowerCase()] : []))),
  };
}

export type ImportContext = Awaited<ReturnType<typeof loadContext>>;

function planRow(ctx: ImportContext, line: number, d: ImportRow, was?: string): PlannedRow {
  const base = {
    line,
    fullName: d.full_name,
    schoolCode: d.school_code,
    roleKey: d.role,
    classCode: d.class,
    data: d,
  };
  const errors: string[] = [];
  const notes: string[] = was ? [`codeFixed:${was}`] : [];
  const school = ctx.school.get(d.school_code);
  const role = ctx.role.get(d.role);
  // A school that is not there yet is created from its name and code (see apply.ts).
  const schoolId = school?.id ?? `new:${d.school_code}`;
  if (!school) {
    if (d.school_name) notes.push(`newSchool:${d.school_name}`);
    else errors.push("school_code");
  }
  if (!role || role.status !== "active") errors.push("role");
  // The role's scope type decides the account type: self-scoped roles are learner accounts.
  const isStudent = role?.default_scope_type === "self";
  if (role?.default_scope_type === "platform") errors.push("roleNotImportable");
  if (role?.default_scope_type === "class" && !d.class) errors.push("class");
  const grade =
    d.grade ??
    (d.class ? (ctx.gradeOf.get(`${schoolId}/${d.class}`) ?? gradeOfClass(d.class)) : undefined);
  if ((d.class || role?.default_scope_type === "grade") && !grade) errors.push("grade");
  if (grade && school && !ctx.grade.has(`${schoolId}/${grade}`)) notes.push(`newGrade:${grade}`);
  if (d.class && !ctx.klass.has(`${schoolId}/${d.class}`)) {
    // A school without a current year gets one when the class is made (see apply.ts).
    if (school && !ctx.year.has(schoolId)) notes.push("newYear");
    if (school) notes.push(`newClass:${d.class}`);
  }
  const byCode = isStudent || !d.email;
  const named = `${schoolId}/${d.full_name.toLowerCase()}`;
  const exists = d.username
    ? ctx.usernames.has(`${schoolId}/${d.username}`)
    : d.email && !isStudent
      ? ctx.emails.has(d.email)
      : ctx.names.has(named);
  let username = byCode ? d.username : undefined;
  if (byCode && !username && !exists && errors.length === 0) {
    username = usernameFor(d.full_name, (u) => ctx.usernames.has(`${schoolId}/${u}`));
    ctx.usernames.add(`${schoolId}/${username}`);
  }
  const login = byCode ? (username ?? "") : (d.email ?? "");
  const row = { ...base, login, errors, notes, isStudent, username, grade };
  if (errors.length) return { ...row, status: "error" };
  return { ...row, status: exists ? "exists" : "create" };
}

export async function planImport(
  db: Db,
  csv: string,
): Promise<ImportPlan & { ctx?: ImportContext }> {
  const parsed = parseImportCsv(csv);
  const counts = { create: 0, exists: 0, error: 0 };
  if (parsed.fileErrors.length) return { rows: [], fileErrors: parsed.fileErrors, counts };
  const valid = parsed.rows.flatMap((r) => (r.ok ? [r.data] : []));
  // Codes a spreadsheet counted upwards go back to the school of the row above.
  const codes = [...new Set(valid.map((r) => r.school_code))];
  const { data: real } = await db
    .from("schools")
    .select("code")
    .in("code", codes.length ? codes : ["-"]);
  const known = new Set((real ?? []).map((s) => s.code));
  const fixed = repairFilledCodes(valid, (c) => known.has(c));
  const ctx = await loadContext(db, valid);
  const rows = parsed.rows.map((r): PlannedRow =>
    r.ok
      ? planRow(ctx, r.line, r.data, fixed.get(r.data))
      : {
          line: r.line,
          status: "error",
          errors: r.errors,
          notes: [],
          fullName: r.raw.full_name ?? "",
          login: r.raw.username || r.raw.email || "",
          schoolCode: r.raw.school_code ?? "",
          roleKey: r.raw.role ?? "",
        },
  );
  for (const r of rows) counts[r.status]++;
  return { rows, fileErrors: [], counts, ctx };
}
