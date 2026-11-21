import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, connect, count, createSchoolB, type Db, demo, inTx } from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

describe("cross-school isolation (RLS)", () => {
  it("teacher of 4A sees only own school and own class students", () =>
    inTx(db, async () => {
      const b = await createSchoolB(db);
      await as(db, demo.teacher);
      expect(await count(db, "select 1 from schools")).toBe(1);
      expect(await count(db, "select 1 from schools where id = $1", [b.school])).toBe(0);
      expect(await count(db, "select 1 from classes where school_id = $1", [b.school])).toBe(0);
      expect(await count(db, "select 1 from profiles where id = $1", [b.student])).toBe(0);
      expect(await count(db, "select 1 from profiles where id = $1", [b.teacher])).toBe(0);
      expect(await count(db, "select 1 from enrolments where school_id = $1", [b.school])).toBe(0);
      // own class: 10 students in 4A + self
      expect(await count(db, "select 1 from profiles where kind = 'student'")).toBe(10);
      expect(await count(db, "select 1 from profiles where id = $1", [demo.student11])).toBe(0);
      expect(await count(db, "select 1 from enrolments where class_id = $1", [demo.class4B])).toBe(
        0,
      );
    }));

  it("teacher in school B cannot see school A", () =>
    inTx(db, async () => {
      const b = await createSchoolB(db);
      await as(db, b.teacher);
      expect(await count(db, "select 1 from schools where id = $1", [demo.school])).toBe(0);
      expect(await count(db, "select 1 from profiles where school_id = $1", [demo.school])).toBe(0);
      expect(await count(db, "select 1 from profiles where kind = 'student'")).toBe(1);
    }));

  it("principal sees all of own school and nothing of another", () =>
    inTx(db, async () => {
      const b = await createSchoolB(db);
      await as(db, demo.principal);
      expect(await count(db, "select 1 from profiles where kind = 'student'")).toBe(20);
      expect(await count(db, "select 1 from profiles where school_id = $1", [b.school])).toBe(0);
      expect(await count(db, "select 1 from user_roles where school_id = $1", [b.school])).toBe(0);
      expect(await count(db, "select 1 from supervision_links")).toBeGreaterThan(0);
    }));

  it("student sees only themself", () =>
    inTx(db, async () => {
      await as(db, demo.student1);
      expect(await count(db, "select 1 from profiles")).toBe(1);
      expect(await count(db, "select 1 from enrolments")).toBe(1);
      expect(await count(db, "select 1 from user_roles")).toBe(1);
      expect(await count(db, "select 1 from teaching_assignments")).toBe(0);
      expect(await count(db, "select 1 from audit_log")).toBe(0);
    }));

  it("owner sees every school", () =>
    inTx(db, async () => {
      await createSchoolB(db);
      await as(db, demo.owner);
      expect(await count(db, "select 1 from schools")).toBe(2);
      expect(await count(db, "select 1 from profiles where kind = 'student'")).toBe(21);
    }));

  it("anonymous role can read nothing", () =>
    inTx(db, async () => {
      await db.query("set local role anon");
      await expect(db.query("select * from profiles")).rejects.toThrow(/permission denied/);
    }));

  it("disabled users lose all access", () =>
    inTx(db, async () => {
      await db.query("update profiles set status = 'disabled' where id = $1", [demo.principal]);
      await as(db, demo.principal);
      expect(await count(db, "select 1 from profiles where kind = 'student'")).toBe(0);
    }));
});
