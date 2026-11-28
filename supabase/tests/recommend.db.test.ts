import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, asAdmin, connect, count, type Db, demo, demoId, expectRejects, inTx } from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const rec = "select public.recommend_unit($1, $2, $3::jsonb, $4)";
const whole = (id: string) => JSON.stringify([{ type: "class", id }]);

/** The general learners' group with one approved learner, made inside the current tx. */
async function generalLearner() {
  await asAdmin(db);
  const school = randomUUID();
  const learner = randomUUID();
  await db.query(
    "insert into schools (id, code, name_en, name_ar) values ($1, 'GENERAL', 'General', 'عام')",
    [school],
  );
  await db.query("insert into auth.users (id, email) values ($1, $2)", [learner, "l@test.local"]);
  await db.query(
    "insert into profiles (id, school_id, kind, username, full_name) values ($1, $2, 'student', 'lay.l', 'Layla')",
    [learner, school],
  );
  return { school, learner };
}
const sees = (id: string) => count(db, "select 1 from profiles where id = $1", [id]);

describe("recommending units", () => {
  it("a teacher recommends a unit to their own class; the students see it and nobody else can", () =>
    inTx(db, async () => {
      await asAdmin(db);
      await db.query(
        `insert into course_units (id, strand, level, unit, title, content, hash)
         values ('RW-A1-U09', 'RW', 'A1', 9, 'Nine', '{}'::jsonb, 'h')`,
      );
      await as(db, demo.teacher);
      const { rows } = await db.query(rec, [
        demo.class4A,
        "RW-A1-U09",
        whole(demo.class4A),
        "Try this",
      ]);
      expect(Number(Object.values(rows[0] ?? {})[0])).toBeGreaterThan(0);
      await expectRejects(
        db,
        rec,
        [demo.class4B, "RW-A1-U09", whole(demo.class4B), ""],
        /forbidden/,
      );
      await expectRejects(
        db,
        rec,
        [demo.class4A, "NO-SUCH-1", whole(demo.class4A), ""],
        /not available/,
      );

      await as(db, demo.student1);
      expect(await count(db, "select 1 from unit_recommendations")).toBe(1);
      expect(await count(db, "select 1 from notifications where kind = 'recommendation'")).toBe(1);
      await expectRejects(
        db,
        rec,
        [demo.class4A, "RW-A1-U09", whole(demo.class4A), ""],
        /forbidden/,
      );
      await as(db, demo.student11); // 4B
      expect(await count(db, "select 1 from unit_recommendations")).toBe(0);
    }));
});

describe("general learners are the Owner's until given to a teacher", () => {
  it("no teacher or school leader sees a general learner; the one the Owner chooses does", () =>
    inTx(db, async () => {
      const { learner } = await generalLearner();
      const other = demoId("teacher4b");
      for (const who of [demo.teacher, other, demo.principal, demo.vp, demo.coach]) {
        await as(db, who);
        expect(await sees(learner), who).toBe(0);
      }
      await as(db, demo.owner);
      expect(await sees(learner)).toBe(1);
      // Only the Owner hands learners out.
      await as(db, demo.principal);
      await expectRejects(
        db,
        "select public.assign_learner_teacher($1, $2)",
        [learner, demo.teacher],
        /forbidden/,
      );

      await as(db, demo.owner);
      await db.query("select public.assign_learner_teacher($1, $2)", [learner, demo.teacher]);
      await as(db, demo.teacher);
      expect(await sees(learner)).toBe(1);
      // The teacher can write to them, though they are not of the teacher's school.
      await db.query("select public.send_message('students', $1::jsonb, 'Welcome')", [
        JSON.stringify([{ type: "student", id: learner }]),
      ]);
      for (const who of [other, demo.principal, demo.coach]) {
        await as(db, who);
        expect(await sees(learner), who).toBe(0);
      }
      await as(db, learner);
      expect(await count(db, "select 1 from messages")).toBe(1);

      await as(db, demo.owner);
      await db.query("select public.unassign_learner_teacher($1, $2)", [learner, demo.teacher]);
      await as(db, demo.teacher);
      expect(await sees(learner)).toBe(0);
    }));
});
