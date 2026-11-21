import "server-only";
import type { createClient } from "@/lib/supabase/server";
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
    db.from("profiles").select("username, email, school_id").in("school_id", ids),
  ]);
  return {
    school: new Map((schools ?? []).map((s) => [s.code, s])),
    role: new Map((roles.data ?? []).map((r) => [r.key, r])),
    grade: new Map((grades.data ?? []).map((g) => [`${g.school_id}/${g.code}`, g])),
    klass: new Map((classes.data ?? []).map((c) => [`${c.school_id}/${c.code}`, c])),
    year: new Map((years.data ?? []).map((y) => [y.school_id, y])),
    usernames: new Set(
      (profiles.data ?? []).flatMap((p) => (p.username ? [`${p.school_id}/${p.username}`] : [])),
    ),
    emails: new Set((profiles.data ?? []).flatMap((p) => (p.email ? [p.email.toLowerCase()] : []))),
  };
}

export type ImportContext = Awaited<ReturnType<typeof loadContext>>;

function planRow(ctx: ImportContext, line: number, d: ImportRow): PlannedRow {
  const base = {
    line,
    fullName: d.full_name,
    schoolCode: d.school_code,
    roleKey: d.role,
    classCode: d.class,
    data: d,
  };
  const errors: string[] = [];
  const notes: string[] = [];
  const school = ctx.school.get(d.school_code);
  const role = ctx.role.get(d.role);
  if (!school) errors.push("school_code");
  if (!role || role.status !== "active") errors.push("role");
  // The role's scope type decides the account type: self-scoped roles are learner accounts.
  const isStudent = role?.default_scope_type === "self";
  if (role?.default_scope_type === "platform") errors.push("roleNotImportable");
  if (role && isStudent && !d.username) errors.push("username");
  if (role && !isStudent && !d.email) errors.push("email");
  if (role?.default_scope_type === "class" && !d.class) errors.push("class");
  if (role?.default_scope_type === "grade" && !d.grade) errors.push("grade");
  if (school && (d.class || d.grade)) {
    if (d.grade && !ctx.grade.has(`${school.id}/${d.grade}`)) notes.push(`newGrade:${d.grade}`);
    if (d.class && !ctx.klass.has(`${school.id}/${d.class}`)) {
      if (!ctx.year.has(school.id)) errors.push("noCurrentYear");
      else notes.push(`newClass:${d.class}`);
    }
  }
  const login = isStudent ? (d.username ?? "") : (d.email ?? "");
  if (errors.length) return { ...base, login, status: "error", errors, notes };
  const exists = isStudent
    ? ctx.usernames.has(`${school?.id}/${d.username}`)
    : ctx.emails.has(d.email ?? "");
  return { ...base, login, status: exists ? "exists" : "create", errors, notes, isStudent };
}

export async function planImport(
  db: Db,
  csv: string,
): Promise<ImportPlan & { ctx?: ImportContext }> {
  const parsed = parseImportCsv(csv);
  const counts = { create: 0, exists: 0, error: 0 };
  if (parsed.fileErrors.length) return { rows: [], fileErrors: parsed.fileErrors, counts };
  const valid = parsed.rows.flatMap((r) => (r.ok ? [r.data] : []));
  const ctx = await loadContext(db, valid);
  const rows = parsed.rows.map((r): PlannedRow =>
    r.ok
      ? planRow(ctx, r.line, r.data)
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
