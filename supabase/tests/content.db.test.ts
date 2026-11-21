import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, asAdmin, connect, count, type Db, demo, expectRejects, inTx } from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

/** A department, skill, question with options and a lesson — created as superuser inside the tx. */
async function sampleContent() {
  await asAdmin(db);
  await db.query(`
    with d as (insert into departments (code, name_en, name_ar) values ('TST', 'Test', 'اختبار') returning id),
    s as (insert into skills (department_id, code, name_en, name_ar) select id, 'GRAM', 'Grammar', 'قواعد' from d returning id, department_id),
    i as (insert into items (code, department_id, skill_id, item_type, stem, correct, difficulty)
          select 'TST-1', department_id, id, 'mcq_single', 'Pick one', 'B', 4 from s returning id)
    insert into item_options (item_id, label, body) select id, l, l from i, unnest(array['A','B']) l`);
  await db.query(`
    insert into lessons (code, department_id, skill_id, title_en, title_ar, format)
    select 'L-TST-1', s.department_id, s.id, 'Lesson', 'درس', 'reading' from skills s where s.code = 'GRAM'
      and s.department_id = (select id from departments where code = 'TST')`);
  await db.query(
    `insert into integration_secrets (provider, ciphertext) values ('google', 'v1.secret') on conflict (provider) do nothing`,
  );
}

describe("content access (RLS)", () => {
  it("a class-scoped teacher can browse lessons and questions", () =>
    inTx(db, async () => {
      await sampleContent();
      await as(db, demo.teacher);
      expect(await count(db, "select 1 from lessons where code = 'L-TST-1'")).toBe(1);
      expect(await count(db, "select 1 from items where code = 'TST-1'")).toBe(1);
      expect(await count(db, "select 1 from item_options")).toBe(2);
    }));

  it("students see lessons but never questions or answer keys", () =>
    inTx(db, async () => {
      await sampleContent();
      await as(db, demo.student1);
      expect(await count(db, "select 1 from lessons where code = 'L-TST-1'")).toBe(1);
      expect(await count(db, "select 1 from departments where code = 'TST'")).toBe(1);
      expect(await count(db, "select 1 from items")).toBe(0);
      expect(await count(db, "select 1 from item_options")).toBe(0);
    }));

  it("only the Owner (content:import) can write content", () =>
    inTx(db, async () => {
      await sampleContent();
      await as(db, demo.principal);
      await expectRejects(
        db,
        "insert into departments (code, name_en, name_ar) values ('HACK', 'x', 'x')",
        [],
        /row-level security/,
      );
      const r = await db.query("update items set correct = 'A' where code = 'TST-1'");
      expect(r.rowCount).toBe(0);
      await as(db, demo.owner);
      expect((await db.query("update items set correct = 'A' where code = 'TST-1'")).rowCount).toBe(
        1,
      );
    }));

  it("the Drive key in integration_secrets is unreadable through the API, even for the Owner", () =>
    inTx(db, async () => {
      await sampleContent();
      await as(db, demo.owner);
      await expectRejects(db, "select * from integration_secrets", [], /permission denied/);
    }));

  it("disabled accounts lose content access too", () =>
    inTx(db, async () => {
      await sampleContent();
      await db.query("update profiles set status = 'disabled' where id = $1", [demo.teacher]);
      await as(db, demo.teacher);
      expect(await count(db, "select 1 from lessons")).toBe(0);
    }));
});
