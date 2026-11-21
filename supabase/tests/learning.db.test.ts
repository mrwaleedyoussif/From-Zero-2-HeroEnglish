import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, asAdmin, connect, count, type Db, demo, demoId, expectRejects, inTx } from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const student2 = demoId("student:2"); // 4A
const student12 = demoId("student:12"); // 4B

async function lesson(): Promise<string> {
  await asAdmin(db);
  const { rows } = await db.query<{ id: string }>(`
    with d as (insert into departments (code, name_en, name_ar) values ('TSTL', 'T', 'T') returning id),
    s as (insert into skills (department_id, code, name_en, name_ar) select id, 'GRAM', 'G', 'G' from d returning id, department_id)
    insert into lessons (code, department_id, skill_id, title_en, title_ar, cefr, format)
    select 'L-TST-1', department_id, id, 'Lesson', 'درس', 'A2', 'reading' from s returning id`);
  return rows[0]?.id ?? "";
}

async function groupOf(students: string[]): Promise<string> {
  const g = await db.query<{ id: string }>(
    "insert into groups (school_id, class_id, name) values ($1, $2, 'Pair') returning id",
    [demo.school, demo.class4A],
  );
  const id = g.rows[0]?.id ?? "";
  for (const s of students)
    await db.query("insert into group_members (group_id, student_id) values ($1, $2)", [id, s]);
  return id;
}

const assign = (lessonId: string, cls: string, targets: unknown) =>
  db.query<{ id: string }>(
    "select public.assign_lesson($1, $2, $3::jsonb, now() + interval '7 days', 'Read it', true) as id",
    [cls, lessonId, JSON.stringify(targets)],
  );

describe("learning RLS", () => {
  it("teachers manage groups only in their own class, with that class's students", () =>
    inTx(db, async () => {
      await as(db, demo.teacher);
      const group = await groupOf([demo.student1, student2]);
      expect(await count(db, "select 1 from group_members where group_id = $1", [group])).toBe(2);
      await expectRejects(
        db,
        "insert into group_members (group_id, student_id) values ($1, $2)",
        [group, demo.student11],
        /row-level security/,
      );
      await expectRejects(
        db,
        "insert into groups (school_id, class_id, name) values ($1, $2, 'X')",
        [demo.school, demo.class4B],
        /row-level security/,
      );
    }));

  it("assigning to a group reaches only its members, with a notification each", () =>
    inTx(db, async () => {
      const lessonId = await lesson();
      await as(db, demo.teacher);
      const group = await groupOf([demo.student1, student2]);
      const { rows } = await assign(lessonId, demo.class4A, [{ type: "group", id: group }]);
      const id = rows[0]?.id;
      expect(
        await count(db, "select 1 from assignment_progress where assignment_id = $1", [id]),
      ).toBe(2);
      await expectRejects(
        db,
        "select public.assign_lesson($1, $2, $3::jsonb, null, null, true)",
        [demo.class4B, lessonId, JSON.stringify([{ type: "class", id: demo.class4B }])],
        /forbidden/,
      );

      await as(db, demo.student1);
      expect(await count(db, "select 1 from assignments")).toBe(1);
      expect(await count(db, "select 1 from notifications where kind = 'assignment'")).toBe(1);
      const upd = await db.query(
        "update assignment_progress set status = 'done', score = 100 where student_id = $1",
        [demo.student1],
      );
      expect(upd.rowCount).toBe(0);
      await expectRejects(
        db,
        "update notifications set params = '{}' where user_id = $1",
        [demo.student1],
        /permission denied/,
      );
      const read = await db.query("update notifications set read_at = now() where user_id = $1", [
        demo.student1,
      ]);
      expect(read.rowCount).toBe(1);

      await as(db, demo.student11);
      expect(await count(db, "select 1 from assignments")).toBe(0);
      expect(await count(db, "select 1 from notifications")).toBe(0);
    }));

  it("learners own their profile; class staff read it and annotate; students never see notes", () =>
    inTx(db, async () => {
      await as(db, demo.student1);
      await db.query(
        "insert into learner_profiles (student_id, school_id, interests) values ($1, $2, '{sports}')",
        [demo.student1, demo.school],
      );
      await expectRejects(
        db,
        "insert into learner_profiles (student_id, school_id) values ($1, $2)",
        [student2, demo.school],
        /row-level security/,
      );

      await as(db, demo.teacher);
      expect(
        await count(db, "select 1 from learner_profiles where student_id = $1", [demo.student1]),
      ).toBe(1);
      expect((await db.query("update learner_profiles set interests = '{}'")).rowCount).toBe(0);
      await db.query(
        "insert into learner_notes (student_id, school_id, author_id, body) values ($1, $2, $3, 'Shy, loves football')",
        [demo.student1, demo.school, demo.teacher],
      );
      await expectRejects(
        db,
        "insert into learner_notes (student_id, school_id, author_id, body) values ($1, $2, $3, 'x')",
        [student12, demo.school, demo.teacher],
        /row-level security/,
      );

      await as(db, demo.student1);
      expect(await count(db, "select 1 from learner_notes")).toBe(0);
    }));

  it("a team holds at most five students", () =>
    inTx(db, async () => {
      await as(db, demo.teacher);
      const t = await db.query<{ id: string }>(
        "insert into teams (school_id, class_id, name) values ($1, $2, 'Lions') returning id",
        [demo.school, demo.class4A],
      );
      const team = t.rows[0]?.id;
      for (let i = 1; i <= 5; i++)
        await db.query("insert into team_members (team_id, student_id) values ($1, $2)", [
          team,
          demoId(`student:${i}`),
        ]);
      await expectRejects(
        db,
        "insert into team_members (team_id, student_id) values ($1, $2)",
        [team, demoId("student:6")],
        /team is full/,
      );
    }));
});
