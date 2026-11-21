import { describe, expect, it } from "vitest";
import {
  type AuthoritySnapshot,
  evaluate,
  evaluateAny,
  explain,
  heldPermissions,
  type Override,
  platformTarget,
  type RoleGrant,
  type Scope,
  scopeContains,
  type Target,
} from "./engine";

const ME = "user-me";
const SCHOOL_A = "school-a";
const SCHOOL_B = "school-b";
const GRADE_4 = "grade-4";
const CLASS_4A = "class-4a";
const CLASS_4B = "class-4b";
const NOW = new Date("2026-11-21T12:00:00Z");

const t = (over: Partial<Target> = {}): Target => ({ ...platformTarget, ...over });
const in4A = t({ school: SCHOOL_A, grade: GRADE_4, class: CLASS_4A });
const in4B = t({ school: SCHOOL_A, grade: GRADE_4, class: CLASS_4B });
const schoolA = t({ school: SCHOOL_A });
const schoolB = t({ school: SCHOOL_B, grade: "grade-b", class: "class-b" });

function role(scope: Scope, perms: string[], active = true): RoleGrant {
  return { roleId: "r", roleKey: "k", roleActive: active, scope, permissions: new Set(perms) };
}
function override(
  effect: "allow" | "deny",
  permission: string,
  scope: Scope,
  expiresAt: Date | null = null,
): Override {
  return { id: `${effect}-${permission}`, effect, permission, scope, expiresAt };
}
function snap(roles: RoleGrant[], overrides: Override[] = [], active = true): AuthoritySnapshot {
  return { userId: ME, active, roles, overrides };
}

describe("scopeContains", () => {
  const cases: [Scope, Target, boolean][] = [
    [{ type: "platform", id: null }, platformTarget, true],
    [{ type: "platform", id: null }, schoolB, true],
    [{ type: "school", id: SCHOOL_A }, in4A, true],
    [{ type: "school", id: SCHOOL_A }, schoolB, false],
    [{ type: "school", id: SCHOOL_A }, platformTarget, false],
    [{ type: "grade", id: GRADE_4 }, in4B, true],
    [{ type: "grade", id: GRADE_4 }, schoolA, false],
    [{ type: "class", id: CLASS_4A }, in4A, true],
    [{ type: "class", id: CLASS_4A }, in4B, false],
    [{ type: "class", id: CLASS_4A }, schoolA, false],
    [{ type: "self", id: null }, t({ school: SCHOOL_A, user: ME }), true],
    [{ type: "self", id: null }, t({ school: SCHOOL_A, user: "someone-else" }), false],
    [{ type: "self", id: null }, schoolA, false],
  ];
  it.each(cases)("%o contains %o → %s", (scope, target, expected) => {
    expect(scopeContains(scope, ME, target)).toBe(expected);
  });
});

describe("precedence: deny override > allow override > role > nothing", () => {
  const classRole = role({ type: "class", id: CLASS_4A }, ["students:view"]);

  it("nothing granted → denied", () => {
    expect(explain(snap([]), "students:view", in4A, NOW)).toMatchObject({
      allowed: false,
      reason: "none",
    });
  });

  it("role permission in scope → allowed", () => {
    expect(explain(snap([classRole]), "students:view", in4A, NOW)).toMatchObject({
      allowed: true,
      reason: "role",
    });
  });

  it("role permission out of scope → denied", () => {
    expect(evaluate(snap([classRole]), "students:view", in4B, NOW)).toBe(false);
  });

  it("role without that permission → denied", () => {
    expect(evaluate(snap([classRole]), "students:edit", in4A, NOW)).toBe(false);
  });

  it("allow override grants an extra permission", () => {
    const s = snap(
      [classRole],
      [override("allow", "students:edit", { type: "class", id: CLASS_4A })],
    );
    expect(explain(s, "students:edit", in4A, NOW)).toMatchObject({
      allowed: true,
      reason: "allow_override",
    });
  });

  it("allow override extends to another class", () => {
    const s = snap(
      [classRole],
      [override("allow", "students:view", { type: "class", id: CLASS_4B })],
    );
    expect(evaluate(s, "students:view", in4B, NOW)).toBe(true);
  });

  it("deny override beats the role", () => {
    const s = snap(
      [classRole],
      [override("deny", "students:view", { type: "class", id: CLASS_4A })],
    );
    expect(explain(s, "students:view", in4A, NOW)).toMatchObject({
      allowed: false,
      reason: "deny_override",
    });
  });

  it("deny override beats an allow override", () => {
    const scope: Scope = { type: "school", id: SCHOOL_A };
    const s = snap(
      [],
      [override("allow", "reports:view", scope), override("deny", "reports:view", scope)],
    );
    expect(explain(s, "reports:view", schoolA, NOW).reason).toBe("deny_override");
  });

  it("deny override outside the target's scope does not apply", () => {
    const s = snap(
      [classRole],
      [override("deny", "students:view", { type: "class", id: CLASS_4B })],
    );
    expect(evaluate(s, "students:view", in4A, NOW)).toBe(true);
  });

  it("platform deny blocks everywhere, even a platform role", () => {
    const s = snap(
      [role({ type: "platform", id: null }, ["audit:view"])],
      [override("deny", "audit:view", { type: "platform", id: null })],
    );
    expect(evaluate(s, "audit:view", schoolA, NOW)).toBe(false);
  });

  it("expired overrides are ignored", () => {
    const past = new Date("2026-11-20T00:00:00Z");
    const s = snap(
      [classRole],
      [
        override("deny", "students:view", { type: "class", id: CLASS_4A }, past),
        override("allow", "students:edit", { type: "class", id: CLASS_4A }, past),
      ],
    );
    expect(evaluate(s, "students:view", in4A, NOW)).toBe(true);
    expect(evaluate(s, "students:edit", in4A, NOW)).toBe(false);
  });

  it("future-expiring overrides apply", () => {
    const future = new Date("2026-12-01T00:00:00Z");
    const s = snap(
      [],
      [override("allow", "lessons:assign", { type: "school", id: SCHOOL_A }, future)],
    );
    expect(evaluate(s, "lessons:assign", in4B, NOW)).toBe(true);
  });

  it("disabled role grants nothing", () => {
    const s = snap([role({ type: "school", id: SCHOOL_A }, ["users:view"], false)]);
    expect(evaluate(s, "users:view", schoolA, NOW)).toBe(false);
  });

  it("disabled user is denied even with allow override", () => {
    const s = snap([], [override("allow", "users:view", { type: "platform", id: null })], false);
    expect(explain(s, "users:view", schoolA, NOW)).toMatchObject({
      allowed: false,
      reason: "inactive",
    });
  });
});

describe("cross-school isolation", () => {
  const principalA = snap([role({ type: "school", id: SCHOOL_A }, ["users:view"])]);
  it("school-scoped grant never reaches another school", () => {
    expect(evaluate(principalA, "users:view", in4A, NOW)).toBe(true);
    expect(evaluate(principalA, "users:view", schoolB, NOW)).toBe(false);
  });
  it("platform-level targets need platform scope", () => {
    expect(evaluate(principalA, "users:view", platformTarget, NOW)).toBe(false);
    const owner = snap([role({ type: "platform", id: null }, ["users:view"])]);
    expect(evaluate(owner, "users:view", platformTarget, NOW)).toBe(true);
  });
});

describe("user targets (several contexts)", () => {
  const teacher = snap([role({ type: "class", id: CLASS_4A }, ["users:view"])]);
  it("allowed when any context is in scope", () => {
    expect(evaluateAny(teacher, "users:view", [schoolA, in4A], NOW)).toBe(true);
    expect(evaluateAny(teacher, "users:view", [schoolA, in4B], NOW)).toBe(false);
  });
  it("self scope matches the user themself", () => {
    const student = snap([role({ type: "self", id: null }, ["learning:self"])]);
    expect(evaluateAny(student, "learning:self", [t({ school: SCHOOL_A, user: ME })], NOW)).toBe(
      true,
    );
    expect(
      evaluateAny(student, "learning:self", [t({ school: SCHOOL_A, user: "other" })], NOW),
    ).toBe(false);
  });
});

describe("heldPermissions", () => {
  it("unions roles and live allow overrides, minus platform denies", () => {
    const s = snap(
      [role({ type: "class", id: CLASS_4A }, ["students:view", "lessons:view"])],
      [
        override("allow", "reports:view", { type: "school", id: SCHOOL_A }),
        override("deny", "lessons:view", { type: "platform", id: null }),
        override("allow", "audit:view", { type: "school", id: SCHOOL_A }, new Date("2020-01-01")),
      ],
    );
    expect([...heldPermissions(s, NOW)].sort()).toEqual(["reports:view", "students:view"]);
  });
});
