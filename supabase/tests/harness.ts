import { createHash, randomUUID } from "node:crypto";
import { Client } from "pg";

export const DB_URL =
  process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/** Same deterministic IDs as supabase/seed/10_demo.sql (md5 → uuid). */
export function demoId(label: string): string {
  const h = createHash("md5").update(`linguapath-demo:${label}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const demo = {
  school: demoId("school:RIY01"),
  year: demoId("year:RIY01:2026-2027"),
  grade4: demoId("grade:RIY01:4"),
  class4A: demoId("class:RIY01:4A"),
  class4B: demoId("class:RIY01:4B"),
  owner: demoId("owner"),
  principal: demoId("principal"),
  vp: demoId("vp"),
  coach: demoId("coach"),
  teacher: demoId("teacher"),
  student1: demoId("student:1"), // 4A
  student11: demoId("student:11"), // 4B
};

export type Db = Client;

export async function connect(): Promise<Db> {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();
  return c;
}

/** Run fn in a transaction that is always rolled back, so tests never leave data behind. */
export async function inTx<T>(db: Db, fn: () => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    return await fn();
  } finally {
    await db.query("rollback");
  }
}

/** Act as a signed-in user for the rest of the transaction (RLS applies). */
export async function as(db: Db, userId: string): Promise<void> {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: userId, role: "authenticated" }),
  ]);
  await db.query("set local role authenticated");
}

/** Back to the superuser for fixture setup inside the same transaction. */
export async function asAdmin(db: Db): Promise<void> {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claims', '', true)");
}

export async function count(db: Db, sql: string, params: unknown[] = []): Promise<number> {
  const r = await db.query<{ n: string }>(`select count(*) as n from (${sql}) x`, params);
  return Number(r.rows[0]?.n ?? 0);
}

export async function bool(db: Db, sql: string, params: unknown[] = []): Promise<boolean> {
  const r = await db.query<{ v: boolean }>(`select (${sql}) as v`, params);
  return r.rows[0]?.v === true;
}

/** A second school with its own teacher (class 5A) and student, created inside the current tx. */
export async function createSchoolB(db: Db) {
  const ids = {
    school: randomUUID(),
    year: randomUUID(),
    grade: randomUUID(),
    class: randomUUID(),
    teacher: randomUUID(),
    student: randomUUID(),
  };
  await asAdmin(db);
  await db.query(
    `insert into public.schools (id, code, name_en, name_ar) values ($1, 'JED01', 'Jeddah Test', 'جدة');
     `.trim(),
    [ids.school],
  );
  await db.query(
    `insert into public.academic_years (id, school_id, name, starts_on, ends_on) values ($1, $2, '2026-2027', '2026-08-23', '2027-06-17')`,
    [ids.year, ids.school],
  );
  await db.query(
    `insert into public.grades (id, school_id, code, name_en, name_ar) values ($1, $2, '5', 'Grade 5', 'الصف 5')`,
    [ids.grade, ids.school],
  );
  await db.query(
    `insert into public.classes (id, school_id, grade_id, year_id, code) values ($1, $2, $3, $4, '5A')`,
    [ids.class, ids.school, ids.grade, ids.year],
  );
  for (const [id, kind, username] of [
    [ids.teacher, "staff", null],
    [ids.student, "student", "ali.b"],
  ] as const) {
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${id}@test.local`]);
    await db.query(
      `insert into public.profiles (id, school_id, kind, username, full_name) values ($1, $2, $3, $4, 'Test')`,
      [id, ids.school, kind, username],
    );
  }
  await db.query(
    `insert into public.enrolments (student_id, class_id, year_id, school_id) values ($1, $2, $3, $4)`,
    [ids.student, ids.class, ids.year, ids.school],
  );
  await db.query(
    `select public.assign_class($1, $2, (select id from public.roles where key = 'teacher'))`,
    [ids.teacher, ids.class],
  );
  return ids;
}

/** Expect a statement to fail without aborting the surrounding transaction. */
export async function expectRejects(
  db: Db,
  sql: string,
  params: unknown[],
  pattern: RegExp,
): Promise<void> {
  await db.query("savepoint expect_rejects");
  let error: unknown;
  try {
    await db.query(sql, params);
  } catch (e) {
    error = e;
  }
  await db.query("rollback to savepoint expect_rejects");
  if (!error) throw new Error(`Expected to fail: ${sql}`);
  if (!pattern.test(String((error as Error).message))) throw error;
}
