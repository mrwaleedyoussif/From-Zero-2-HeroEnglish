import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, asAdmin, connect, count, type Db, demo, expectRejects, inTx } from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const WIDGET = "widget.teacher.atRiskStudents";

/** A second teacher, teaching 4B only. */
async function teacher4B(): Promise<string> {
  await asAdmin(db);
  const id = randomUUID();
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@test.local`]);
  await db.query(
    "insert into profiles (id, school_id, kind, full_name) values ($1, $2, 'staff', 'Teacher 4B')",
    [id, demo.school],
  );
  await db.query("select assign_class($1, $2, (select id from roles where key = 'teacher'))", [
    id,
    demo.class4B,
  ]);
  return id;
}

async function rulesFor(user: string) {
  const r = await db.query<{ target_key: string; subject_type: string; effect: string }>(
    "select target_key, subject_type, effect from visibility_rules_for($1)",
    [user],
  );
  return r.rows;
}

describe("visibility rules reach only their subjects", () => {
  it("a class rule reaches that class's teacher and students, not another class's teacher", () =>
    inTx(db, async () => {
      const other = await teacher4B();
      await as(db, demo.owner);
      await db.query(
        "insert into visibility_rules (target_key, subject_type, subject_id, effect) values ($1, 'class', $2, 'hide')",
        [WIDGET, demo.class4A],
      );
      await as(db, demo.teacher);
      expect(await rulesFor(demo.teacher)).toEqual([
        { target_key: WIDGET, subject_type: "class", effect: "hide" },
      ]);
      await as(db, other);
      expect(await rulesFor(other)).toEqual([]);
      await as(db, demo.student1);
      expect(await rulesFor(demo.student1)).toHaveLength(1);
    }));

  it("role, school and plan rules reach the right people", () =>
    inTx(db, async () => {
      await as(db, demo.owner);
      await db.query(
        `insert into visibility_rules (target_key, subject_type, subject_id, effect) values
          ('module.rewards', 'role', (select id from roles where key = 'teacher'), 'hide'),
          ('module.reports', 'school', $1, 'hide'),
          ('module.ai', 'plan', (select id from plans where key = 'free'), 'show')`,
        [demo.school],
      );
      await as(db, demo.teacher);
      const keys = (await rulesFor(demo.teacher)).map((r) => r.target_key).sort();
      expect(keys).toEqual(["module.ai", "module.reports", "module.rewards"]);
      await as(db, demo.student1);
      expect((await rulesFor(demo.student1)).map((r) => r.target_key).sort()).toEqual([
        "module.ai",
        "module.reports",
      ]);
    }));

  it("users cannot read other people's rules or write rules", () =>
    inTx(db, async () => {
      await as(db, demo.owner);
      await db.query(
        "insert into visibility_rules (target_key, subject_type, subject_id, effect) values ($1, 'user', $2, 'hide')",
        [WIDGET, demo.principal],
      );
      await as(db, demo.teacher);
      expect(await rulesFor(demo.principal)).toEqual([]);
      expect(await count(db, "select 1 from visibility_rules")).toBe(0);
      await expectRejects(
        db,
        "insert into visibility_rules (target_key, subject_type, subject_id, effect) values ($1, 'user', $2, 'show')",
        [WIDGET, demo.teacher],
        /row-level security/,
      );
      await as(db, demo.owner);
      expect(await rulesFor(demo.principal)).toHaveLength(1);
    }));

  it("visibility changes are audited", () =>
    inTx(db, async () => {
      await as(db, demo.owner);
      await db.query(
        "insert into visibility_rules (target_key, subject_type, subject_id, effect) values ($1, 'class', $2, 'hide')",
        [WIDGET, demo.class4A],
      );
      expect(
        await count(
          db,
          "select 1 from audit_log where target_table = 'visibility_rules' and actor_id = $1 and created_at = now()",
          [demo.owner],
        ),
      ).toBe(1);
    }));
});

describe("feature flags", () => {
  it("list rollout reaches only listed subjects", () =>
    inTx(db, async () => {
      await as(db, demo.owner);
      await db.query(
        `insert into feature_flags (key, enabled, rollout, subjects) values
          ('feature.coins', true, 'list', jsonb_build_array(jsonb_build_object('type', 'class', 'id', $1::text))),
          ('feature.streaks', true, 'all', '[]'), ('feature.webPush', false, 'all', '[]')`,
        [demo.class4A],
      );
      await as(db, demo.student1);
      const on = (
        await db.query<{ k: string }>("select feature_flags_for($1) as k", [demo.student1])
      ).rows.map((r) => r.k);
      expect(on.sort()).toEqual(["feature.coins", "feature.streaks"]);
      await as(db, demo.student11);
      const on11 = (
        await db.query<{ k: string }>("select feature_flags_for($1) as k", [demo.student11])
      ).rows.map((r) => r.k);
      expect(on11).toEqual(["feature.streaks"]);
    }));
});

describe("plans and subscriptions", () => {
  it("everyone reads plans; only billing:manage writes; changes are audited", () =>
    inTx(db, async () => {
      await as(db, demo.principal);
      expect(await count(db, "select 1 from plans")).toBe(3);
      await expectRejects(
        db,
        "insert into plans (key, name_en, name_ar) values ('x_plan', 'x', 'x')",
        [],
        /row-level security/,
      );
      await expectRejects(
        db,
        "insert into subscriptions (school_id, plan_id) values ($1, (select id from plans where key = 'school_pro'))",
        [demo.school],
        /row-level security/,
      );
      await as(db, demo.owner);
      await db.query(
        "insert into subscriptions (school_id, plan_id, free_until) values ($1, (select id from plans where key = 'school_pro'), '2027-06-30')",
        [demo.school],
      );
      expect(
        await count(
          db,
          "select 1 from audit_log where target_table = 'subscriptions' and created_at = now()",
        ),
      ).toBe(1);
      await as(db, demo.teacher);
      expect(await count(db, "select 1 from subscriptions")).toBe(1);
      const plan = await db.query<{ k: string }>(
        "select p.key as k from plans p where p.id = school_plan($1)",
        [demo.school],
      );
      expect(plan.rows[0]?.k).toBe("school_pro");
    }));

  it("gate permissions follow roles; principals can still assign the teacher role", () =>
    inTx(db, async () => {
      await as(db, demo.teacher);
      const gates = await db.query<{ ok: boolean; p: string }>(
        "select p, auth_can(p, $1, $2) as ok from unnest(array['gate:teacher','gate:leadership','gate:owner']) p",
        [demo.school, demo.class4A],
      );
      expect(gates.rows.map((r) => `${r.p}=${r.ok}`)).toEqual([
        "gate:teacher=true",
        "gate:leadership=false",
        "gate:owner=false",
      ]);
      await as(db, demo.principal);
      await db.query(
        "insert into user_roles (user_id, role_id, scope_type, scope_id) values ($1, (select id from roles where key = 'teacher'), 'class', $2)",
        [demo.teacher, demo.class4B],
      );
    }));
});
