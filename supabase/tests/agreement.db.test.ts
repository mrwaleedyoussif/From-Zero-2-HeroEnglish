import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthoritySnapshot,
  evaluate,
  type Override,
  type RoleGrant,
  type Scope,
  type Target,
} from "@/lib/auth/engine";
import { asAdmin, connect, type Db, demo, inTx } from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

/** Small seeded PRNG (mulberry32) so failures are reproducible. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PERMS = ["users:view", "students:view", "audit:view"];
const OTHER_SCHOOL = randomUUID();
const OTHER_USER = demo.teacher;

describe("TS engine and SQL can_user_on agree", () => {
  it("on 60 random grant sets × 8 targets × 3 permissions", () =>
    inTx(db, async () => {
      await asAdmin(db);
      const me = randomUUID();
      await db.query("insert into auth.users (id, email) values ($1, $2)", [
        me,
        `${me}@test.local`,
      ]);
      await db.query(
        "insert into profiles (id, school_id, kind, full_name) values ($1, $2, 'staff', 'Matrix')",
        [me, demo.school],
      );
      const roles = [
        { id: randomUUID(), active: true, perms: ["users:view", "students:view"] },
        { id: randomUUID(), active: false, perms: ["audit:view", "users:view"] },
        { id: randomUUID(), active: true, perms: ["audit:view"] },
      ];
      for (const [i, r] of roles.entries()) {
        await db.query(
          `insert into roles (id, key, name_en, name_ar, default_scope_type, status) values ($1, $2, 'm', 'm', 'school', $3)`,
          [r.id, `matrix_${i}`, r.active ? "active" : "disabled"],
        );
        for (const p of r.perms)
          await db.query("insert into role_permissions (role_id, permission_key) values ($1, $2)", [
            r.id,
            p,
          ]);
      }

      const scopes: Scope[] = [
        { type: "platform", id: null },
        { type: "school", id: demo.school },
        { type: "grade", id: demo.grade4 },
        { type: "class", id: demo.class4A },
        { type: "class", id: demo.class4B },
        { type: "self", id: null },
      ];
      const targets: Target[] = [
        { school: null, grade: null, class: null, user: null },
        { school: demo.school, grade: null, class: null, user: null },
        { school: demo.school, grade: demo.grade4, class: demo.class4A, user: null },
        { school: demo.school, grade: demo.grade4, class: demo.class4B, user: null },
        { school: demo.school, grade: null, class: null, user: me },
        { school: demo.school, grade: demo.grade4, class: demo.class4A, user: OTHER_USER },
        { school: OTHER_SCHOOL, grade: null, class: null, user: null },
        { school: OTHER_SCHOOL, grade: null, class: null, user: me },
      ];
      const now = new Date();
      const expiries = [
        null,
        new Date(now.getTime() - 86_400_000),
        new Date(now.getTime() + 86_400_000),
      ];
      const rand = rng(20261121);
      const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)] as T;

      let compared = 0;
      for (let scenario = 0; scenario < 60; scenario++) {
        await db.query("delete from user_roles where user_id = $1", [me]);
        await db.query("delete from user_permission_overrides where user_id = $1", [me]);
        const grants: RoleGrant[] = [];
        const overrides: Override[] = [];
        for (let i = Math.floor(rand() * 3); i > 0; i--) {
          const r = pick(roles);
          const scope = pick(scopes);
          const res = await db.query(
            `insert into user_roles (user_id, role_id, scope_type, scope_id) values ($1, $2, $3, $4) on conflict do nothing`,
            [me, r.id, scope.type, scope.id],
          );
          if (res.rowCount)
            grants.push({
              roleId: r.id,
              roleKey: "m",
              roleActive: r.active,
              scope,
              permissions: new Set(r.perms),
            });
        }
        for (let i = Math.floor(rand() * 4); i > 0; i--) {
          const o: Override = {
            id: randomUUID(),
            permission: pick(PERMS),
            effect: rand() < 0.5 ? "allow" : "deny",
            scope: pick(scopes),
            expiresAt: pick(expiries),
          };
          overrides.push(o);
          await db.query(
            `insert into user_permission_overrides (id, user_id, permission_key, effect, scope_type, scope_id, expires_at)
             values ($1, $2, $3, $4, $5, $6, $7)`,
            [o.id, me, o.permission, o.effect, o.scope.type, o.scope.id, o.expiresAt],
          );
        }
        const snap: AuthoritySnapshot = { userId: me, active: true, roles: grants, overrides };
        for (const target of targets) {
          for (const perm of PERMS) {
            const { rows } = await db.query<{ v: boolean }>(
              "select public.can_user_on($1, $2, $3, $4, $5, $6) as v",
              [me, perm, target.school, target.grade, target.class, target.user],
            );
            const sql = rows[0]?.v;
            const ts = evaluate(snap, perm, target, now);
            expect(
              ts,
              JSON.stringify({
                scenario,
                perm,
                target,
                grants: grants.map((g) => g.scope),
                overrides,
              }),
            ).toBe(sql);
            compared++;
          }
        }
      }
      expect(compared).toBe(60 * targets.length * PERMS.length);
    }));
});
