import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, asAdmin, bool, connect, count, type Db, demo, expectRejects, inTx } from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const roleId = (key: string) => `(select id from public.roles where key = '${key}')`;

describe("acceptance: Owner grants a teacher an extra permission (no redeploy)", () => {
  it("takes effect immediately and disappears when revoked", () =>
    inTx(db, async () => {
      const check = "public.auth_can('students:view', $1, $2)";
      await as(db, demo.teacher);
      expect(await bool(db, check, [demo.school, demo.class4B])).toBe(false);
      expect(await count(db, "select 1 from profiles where id = $1", [demo.student11])).toBe(0);

      await as(db, demo.owner);
      const { rows } = await db.query<{ id: string }>(
        `insert into user_permission_overrides (user_id, permission_key, effect, scope_type, scope_id, reason)
         values ($1, 'students:view', 'allow', 'class', $2, 'covering 4B') returning id`,
        [demo.teacher, demo.class4B],
      );
      await db.query(
        `insert into user_permission_overrides (user_id, permission_key, effect, scope_type, scope_id)
         values ($1, 'users:view', 'allow', 'class', $2)`,
        [demo.teacher, demo.class4B],
      );

      await as(db, demo.teacher);
      expect(await bool(db, check, [demo.school, demo.class4B])).toBe(true);
      expect(await count(db, "select 1 from enrolments where class_id = $1", [demo.class4B])).toBe(
        10,
      );
      expect(await count(db, "select 1 from profiles where id = $1", [demo.student11])).toBe(1);

      await as(db, demo.owner);
      await db.query("delete from user_permission_overrides where id = $1", [rows[0]?.id]);
      await as(db, demo.teacher);
      expect(await bool(db, check, [demo.school, demo.class4B])).toBe(false);
    }));

  it("a deny override beats the teacher's role", () =>
    inTx(db, async () => {
      await as(db, demo.owner);
      await db.query(
        `insert into user_permission_overrides (user_id, permission_key, effect, scope_type, scope_id)
         values ($1, 'users:view', 'deny', 'school', $2)`,
        [demo.teacher, demo.school],
      );
      await as(db, demo.teacher);
      expect(await count(db, "select 1 from profiles where kind = 'student'")).toBe(0);
    }));

  it("every grant change is audited with the actor", () =>
    inTx(db, async () => {
      await as(db, demo.owner);
      await db.query(
        `insert into user_permission_overrides (user_id, permission_key, effect, scope_type, scope_id)
         values ($1, 'reports:view', 'allow', 'school', $2)`,
        [demo.teacher, demo.school],
      );
      await db.query(
        `delete from role_permissions where role_id = ${roleId("vp")} and permission_key = 'reports:view'`,
      );
      const audited = await db.query<{ action: string; target_table: string; actor_id: string }>(
        `select action, target_table, actor_id from audit_log
         where target_table in ('user_permission_overrides', 'role_permissions') and actor_id = $1`,
        [demo.owner],
      );
      expect(audited.rows.map((r) => `${r.target_table}:${r.action}`).sort()).toEqual([
        "role_permissions:delete",
        "user_permission_overrides:insert",
      ]);
    }));
});

describe("no privilege escalation", () => {
  it("principal cannot make anyone Owner or grant what they lack", () =>
    inTx(db, async () => {
      await as(db, demo.principal);
      await expectRejects(
        db,
        `insert into user_roles (user_id, role_id, scope_type) values ($1, ${roleId("owner")}, 'platform')`,
        [demo.teacher],
        /row-level security/,
      );
      // principal holds users:view etc. but not billing:manage → cannot grant it
      await expectRejects(
        db,
        `insert into user_permission_overrides (user_id, permission_key, effect, scope_type, scope_id)
         values ($1, 'billing:manage', 'allow', 'school', $2)`,
        [demo.teacher, demo.school],
        /row-level security/,
      );
      // principal lacks permissions:grant entirely → cannot grant even what they hold
      await expectRejects(
        db,
        `insert into user_permission_overrides (user_id, permission_key, effect, scope_type, scope_id)
         values ($1, 'users:view', 'allow', 'school', $2)`,
        [demo.teacher, demo.school],
        /row-level security/,
      );
      // cannot assign a teacher role in another school's class (unknown to them)
      await expectRejects(
        db,
        `insert into user_roles (user_id, role_id, scope_type, scope_id) values ($1, ${roleId("teacher")}, 'school', gen_random_uuid())`,
        [demo.teacher],
        /row-level security/,
      );
    }));

  it("principal can assign in-school roles within their school", () =>
    inTx(db, async () => {
      await as(db, demo.principal);
      await db.query(
        `insert into user_roles (user_id, role_id, scope_type, scope_id) values ($1, ${roleId("teacher")}, 'class', $2)`,
        [demo.teacher, demo.class4B],
      );
      expect(await count(db, "select 1 from user_roles where user_id = $1", [demo.teacher])).toBe(
        2,
      );
    }));

  it("teacher cannot grant themself permissions or edit roles", () =>
    inTx(db, async () => {
      await as(db, demo.teacher);
      await expectRejects(
        db,
        `insert into user_permission_overrides (user_id, permission_key, effect, scope_type)
         values ($1, 'audit:view', 'allow', 'platform')`,
        [demo.teacher],
        /row-level security/,
      );
      await expectRejects(
        db,
        `insert into user_roles (user_id, role_id, scope_type, scope_id) values ($1, ${roleId("teacher")}, 'class', $2)`,
        [demo.teacher, demo.class4B],
        /row-level security/,
      );
      const r = await db.query(`delete from role_permissions where role_id = ${roleId("teacher")}`);
      expect(r.rowCount).toBe(0);
    }));
});

describe("audit log is append-only", () => {
  it("nobody can insert, update or delete audit rows directly", () =>
    inTx(db, async () => {
      await as(db, demo.owner);
      expect(await count(db, "select 1 from audit_log")).toBeGreaterThan(0);
      await expectRejects(db, "update audit_log set action = 'x'", [], /permission denied/);
      await expectRejects(db, "delete from audit_log", [], /permission denied/);
      await expectRejects(
        db,
        "insert into audit_log (action) values ('forged')",
        [],
        /permission denied/,
      );
      // even the server's service role cannot rewrite history
      await asAdmin(db);
      await db.query("set local role service_role");
      await expectRejects(db, "delete from audit_log", [], /permission denied/);
    }));

  it("log_audit records the caller as actor", () =>
    inTx(db, async () => {
      await as(db, demo.principal);
      await db.query("select public.log_audit('view_as.start', 'profiles', $1, $2, '{}'::jsonb)", [
        demo.teacher,
        demo.school,
      ]);
      expect(
        await count(
          db,
          "select 1 from audit_log where action = 'view_as.start' and actor_id = $1",
          [demo.principal],
        ),
      ).toBe(1);
    }));
});
