import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, asAdmin, connect, count, type Db, demo, demoId, expectRejects, inTx } from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
  await asAdmin(db);
  await db.query("select public.refresh_insights()");
});
afterAll(async () => {
  await db.end();
});

const teacher4b = demoId("teacher4b");
const classesSeen = async () =>
  (
    await db.query<{ class_id: string; students: number }>(
      "select class_id, students from public.class_stats($1)",
      [demo.school],
    )
  ).rows;

describe("dashboard scopes (Phase 7 acceptance)", () => {
  it("principal sees every class; each teacher only their own; the coach their teacher's class", () =>
    inTx(db, async () => {
      await as(db, demo.principal);
      expect((await classesSeen()).map((r) => r.class_id).sort()).toEqual(
        [demo.class4A, demo.class4B].sort(),
      );
      await as(db, demo.teacher);
      expect(await classesSeen()).toEqual([{ class_id: demo.class4A, students: 10 }]);
      await as(db, teacher4b);
      expect((await classesSeen()).map((r) => r.class_id)).toEqual([demo.class4B]);
      await as(db, demo.coach);
      expect((await classesSeen()).map((r) => r.class_id)).toEqual([demo.class4A]);
      await as(db, demo.student1);
      expect(await classesSeen()).toEqual([]);
    }));

  it("individual learners: class staff only — the coach sees aggregates, never students", () =>
    inTx(db, async () => {
      const students = "select * from public.student_stats($1)";
      await as(db, demo.teacher);
      expect(await count(db, students, [demo.class4A])).toBe(10);
      expect(await count(db, students, [demo.class4B])).toBe(0);
      await as(db, demo.coach);
      expect(await count(db, students, [demo.class4A])).toBe(0);
      expect(await count(db, "select * from public.class_skill_matrix($1)", [demo.class4A])).toBe(
        0,
      );
      await as(db, demo.principal);
      expect(await count(db, students, [demo.class4B])).toBe(10);
    }));

  it("teacher usage follows the supervision graph", () =>
    inTx(db, async () => {
      const usage = "select teacher_id from public.teacher_usage($1)";
      await as(db, demo.principal);
      expect(await count(db, usage, [demo.school])).toBe(2);
      await as(db, demo.coach);
      const coach = await db.query<{ teacher_id: string }>(usage, [demo.school]);
      expect(coach.rows.map((r) => r.teacher_id)).toEqual([demo.teacher]);
      await as(db, demo.teacher);
      expect(await count(db, usage, [demo.school])).toBe(0);
    }));

  it("coaching logs: the coach writes for teachers they support; the teacher reads their own", () =>
    inTx(db, async () => {
      const insert = `insert into coaching_logs (school_id, coach_id, teacher_id, kind, notes)
        values ($1, $2, $3, 'observation', 'Good pacing') returning id`;
      await as(db, demo.coach);
      await db.query(insert, [demo.school, demo.coach, demo.teacher]);
      await expectRejects(db, insert, [demo.school, demo.coach, teacher4b], /row-level security/);
      await as(db, demo.teacher);
      expect(await count(db, "select 1 from coaching_logs")).toBe(1);
      await as(db, teacher4b);
      expect(await count(db, "select 1 from coaching_logs")).toBe(0);
      await as(db, demo.principal);
      expect(await count(db, "select 1 from coaching_logs")).toBe(1);
    }));

  it("budget meters are for the Owner only; the raw view is not readable", () =>
    inTx(db, async () => {
      await as(db, demo.owner);
      expect(await count(db, "select * from public.budget_stats()")).toBe(1);
      await as(db, demo.principal);
      expect(await count(db, "select * from public.budget_stats()")).toBe(0);
      await expectRejects(db, "select * from mv_student_activity", [], /permission denied/);
    }));
});
