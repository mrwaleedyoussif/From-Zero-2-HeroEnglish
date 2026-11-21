import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, asAdmin, connect, count, type Db, demo, expectRejects, inTx } from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

/** Department + item, and a session (with one response and a writing submission) for two students. */
async function fixture() {
  await asAdmin(db);
  const { rows } = await db.query<{ dept: string; skill: string; item: string }>(`
    with d as (insert into departments (code, name_en, name_ar) values ('TSTA', 'T', 'T') returning id),
    s as (insert into skills (department_id, code, name_en, name_ar) select id, 'WRIT', 'W', 'W' from d returning id, department_id),
    i as (insert into items (code, department_id, skill_id, item_type, stem, difficulty)
          select 'TSTA-1', department_id, id, 'writing_prompt', 'Write', 5 from s returning id, department_id, skill_id)
    select department_id as dept, skill_id as skill, id as item from i`);
  const f = rows[0];
  if (!f) throw new Error("fixture");
  const sessions: Record<string, string> = {};
  const submissions: Record<string, string> = {};
  for (const student of [demo.student1, demo.student11]) {
    const s = await db.query<{ id: string }>(
      `insert into test_sessions (student_id, school_id, department_id, kind, rng_seed, theta, se)
       values ($1, $2, $3, 'placement', 1, 0.5, 0.4) returning id`,
      [student, demo.school, f.dept],
    );
    const sid = s.rows[0]?.id ?? "";
    sessions[student] = sid;
    await db.query(
      `insert into responses (session_id, student_id, school_id, item_id, item_version, skill_id, seq, answer, correct, time_ms, b_used)
       values ($1, $2, $3, $4, 1, $5, 1, '"x"', null, 1000, 0)`,
      [sid, student, demo.school, f.item, f.skill],
    );
    const sub = await db.query<{ id: string }>(
      `insert into productive_submissions (session_id, student_id, school_id, item_id, skill_id, kind, body)
       values ($1, $2, $3, $4, $5, 'writing', 'My weekend') returning id`,
      [sid, student, demo.school, f.item, f.skill],
    );
    submissions[student] = sub.rows[0]?.id ?? "";
  }
  return { ...f, sessions, submissions };
}

describe("assessment RLS", () => {
  it("students see only their own sessions and can never write results", () =>
    inTx(db, async () => {
      const f = await fixture();
      await as(db, demo.student1);
      expect(await count(db, "select 1 from test_sessions")).toBe(1);
      expect(await count(db, "select 1 from responses")).toBe(1);
      expect(
        await count(db, "select 1 from test_sessions where student_id = $1", [demo.student11]),
      ).toBe(0);
      const upd = await db.query("update test_sessions set theta = 3, cefr = 'C2' where id = $1", [
        f.sessions[demo.student1],
      ]);
      expect(upd.rowCount).toBe(0);
      await expectRejects(
        db,
        `insert into responses (session_id, student_id, school_id, item_id, item_version, skill_id, seq, answer, correct, time_ms, b_used)
         values ($1, $2, $3, $4, 1, $5, 2, '"A"', true, 1, 0)`,
        [f.sessions[demo.student1], demo.student1, demo.school, f.item, f.skill],
        /row-level security/,
      );
      await expectRejects(
        db,
        "insert into ability_estimates (student_id, school_id, department_id, theta, source) values ($1, $2, $3, 3, 'placement')",
        [demo.student1, demo.school, f.dept],
        /row-level security/,
      );
    }));

  it("teachers see their own class's results only; principals see the school", () =>
    inTx(db, async () => {
      await fixture();
      await as(db, demo.teacher);
      expect(
        await count(db, "select 1 from test_sessions where student_id = $1", [demo.student1]),
      ).toBe(1);
      expect(
        await count(db, "select 1 from test_sessions where student_id = $1", [demo.student11]),
      ).toBe(0);
      await as(db, demo.principal);
      expect(await count(db, "select 1 from test_sessions")).toBe(2);
    }));

  it("scoring and retakes need placement:score / placement:retake over that student", () =>
    inTx(db, async () => {
      const f = await fixture();
      const score = `insert into submission_scores (submission_id, scorer_id, scores, cefr, school_id)
                     values ($1, $2, '{"task":"A2"}', 'A2', $3)`;
      await as(db, demo.teacher);
      await db.query(score, [f.submissions[demo.student1], demo.teacher, demo.school]);
      await expectRejects(
        db,
        score,
        [f.submissions[demo.student11], demo.teacher, demo.school],
        /row-level security/,
      );
      const retake =
        "insert into placement_retakes (student_id, department_id, school_id, granted_by) values ($1, $2, $3, $4)";
      await db.query(retake, [demo.student1, f.dept, demo.school, demo.teacher]);
      await expectRejects(
        db,
        retake,
        [demo.student11, f.dept, demo.school, demo.teacher],
        /row-level security/,
      );
      await as(db, demo.student1);
      await expectRejects(
        db,
        retake,
        [demo.student1, f.dept, demo.school, demo.student1],
        /row-level security/,
      );
      expect(await count(db, "select 1 from placement_retakes")).toBe(1);
      expect(await count(db, "select 1 from submission_scores")).toBe(1);
    }));

  it("new departments get placement and progress blueprints automatically", () =>
    inTx(db, async () => {
      const f = await fixture();
      const r = await db.query<{ kind: string; max_items: number }>(
        "select kind, max_items from test_blueprints where department_id = $1 order by kind",
        [f.dept],
      );
      expect(r.rows).toEqual([
        { kind: "placement", max_items: 30 },
        { kind: "progress", max_items: 15 },
      ]);
      expect(await count(db, "select 1 from rubrics where code = 'CEFR-PRODUCTIVE'")).toBe(1);
    }));
});
