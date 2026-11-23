import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  as,
  asAdmin,
  connect,
  count,
  createSchoolB,
  type Db,
  demo,
  expectRejects,
  inTx,
} from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

describe("profile identity is frozen for signed-in users", () => {
  it("a principal can switch a colleague off but not change who they are", () =>
    inTx(db, async () => {
      await as(db, demo.principal);
      await db.query("update profiles set status = 'disabled' where id = $1", [demo.teacher]);
      for (const change of [
        "kind = 'student'",
        "school_id = null",
        "email = 'someone@else.test'",
        "username = 'taken'",
      ])
        await expectRejects(
          db,
          `update profiles set ${change} where id = $1`,
          [demo.teacher],
          /profile identity/,
        );
    }));

  it("server code (service role) still sets identity when it creates accounts", () =>
    inTx(db, async () => {
      await asAdmin(db);
      await db.query("update profiles set username = 'renamed' where id = $1", [demo.student1]);
      expect(await count(db, "select 1 from profiles where username = 'renamed'")).toBe(1);
    }));
});

describe("rows with a school and a class (or people) must agree", () => {
  it("a principal can't enrol a pupil into, or teach in, another school's class", () =>
    inTx(db, async () => {
      const b = await createSchoolB(db);
      await as(db, demo.principal);
      await expectRejects(
        db,
        "insert into enrolments (student_id, class_id, year_id, school_id) values ($1, $2, $3, $4)",
        [demo.student1, b.class, demo.year, demo.school],
        /class does not belong/,
      );
      await expectRejects(
        db,
        "insert into teaching_assignments (teacher_id, class_id, school_id) values ($1, $2, $3)",
        [demo.teacher, b.class, demo.school],
        /class does not belong/,
      );
    }));

  it("a principal can't supervise, enrol or assign people from another school", () =>
    inTx(db, async () => {
      const b = await createSchoolB(db);
      await as(db, demo.principal);
      await expectRejects(
        db,
        "insert into supervision_links (supervisor_id, supervisee_id, school_id) values ($1, $2, $3)",
        [demo.principal, b.teacher, demo.school],
        /inside one school/,
      );
      await expectRejects(
        db,
        "insert into enrolments (student_id, class_id, year_id, school_id) values ($1, $2, $3, $4)",
        [b.student, demo.class4A, demo.year, demo.school],
        /person does not belong/,
      );
      await expectRejects(
        db,
        "insert into teaching_assignments (teacher_id, class_id, school_id) values ($1, $2, $3)",
        [b.teacher, demo.class4A, demo.school],
        /person does not belong/,
      );
    }));

  it("links inside one school still work, and platform staff can supervise", () =>
    inTx(db, async () => {
      await as(db, demo.principal);
      await db.query(
        "insert into supervision_links (supervisor_id, supervisee_id, school_id, kind) values ($1, $2, $3, 'academic')",
        [demo.vp, demo.teacher, demo.school],
      );
      await as(db, demo.owner);
      await db.query(
        "insert into supervision_links (supervisor_id, supervisee_id, school_id, kind) values ($1, $2, $3, 'coaching')",
        [demo.owner, demo.teacher, demo.school],
      );
    }));
});

describe("content imports are not copied into the audit log", () => {
  it("an import job with its rows leaves no audit row", () =>
    inTx(db, async () => {
      await as(db, demo.owner);
      const before = await count(db, "select 1 from audit_log where target_table = 'import_jobs'");
      await db.query(
        `insert into import_jobs (started_by, status, payload) values ($1, 'previewed', '{"rows": {}}')`,
        [demo.owner],
      );
      expect(await count(db, "select 1 from audit_log where target_table = 'import_jobs'")).toBe(
        before,
      );
    }));
});
