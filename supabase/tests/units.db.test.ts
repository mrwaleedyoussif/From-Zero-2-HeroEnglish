import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, asAdmin, connect, count, type Db, demo, expectRejects, inTx } from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const unit = `insert into course_units (id, strand, level, unit, title, content, hash)
  values ('RW-A1-U01', 'RW', 'A1+', 1, 'Unit', '{"answer":"b"}', 'h')`;

describe("course units (RLS)", () => {
  it("units hold answer keys: staff may read them, learners never", () =>
    inTx(db, async () => {
      await asAdmin(db);
      await db.query(unit);
      await as(db, demo.teacher);
      expect(await count(db, "select 1 from course_units")).toBe(1);
      await as(db, demo.student1);
      expect(await count(db, "select 1 from course_units")).toBe(0);
    }));

  it("only content importers write units; nobody writes progress from the browser", () =>
    inTx(db, async () => {
      await as(db, demo.principal);
      await expectRejects(db, unit, [], /row-level security/);
      await asAdmin(db);
      await db.query(unit);
      await as(db, demo.student1);
      await expectRejects(
        db,
        `insert into course_unit_progress (student_id, unit_id, school_id, correct, total)
         select id, 'RW-A1-U01', school_id, 9, 9 from profiles where id = auth.uid()`,
        [],
        /row-level security/,
      );
    }));

  it("a level outside the course's ten is refused", () =>
    inTx(db, async () => {
      await asAdmin(db);
      await expectRejects(db, unit.replace("'A1+'", "'D1'"), [], /check constraint/);
    }));
});
