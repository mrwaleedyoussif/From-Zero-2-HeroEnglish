/**
 * Pure permission engine (SPEC §3). Mirrors SQL `public.can_user_on` exactly —
 * a DB test checks both agree on a generated case matrix. No I/O here.
 *
 * Precedence: deny override > allow override > role permission > nothing.
 * The grant's scope must contain the target.
 */

export const scopeTypes = ["platform", "school", "grade", "class", "self"] as const;
export type ScopeType = (typeof scopeTypes)[number];

export interface Scope {
  type: ScopeType;
  /** null for platform and self. */
  id: string | null;
}

/** What is being acted on. school=null means platform-level (only platform scope contains it). */
export interface Target {
  school: string | null;
  grade: string | null;
  class: string | null;
  user: string | null;
}

export interface RoleGrant {
  roleId: string;
  roleKey: string;
  roleActive: boolean;
  scope: Scope;
  permissions: ReadonlySet<string>;
}

export interface Override {
  id: string;
  permission: string;
  effect: "allow" | "deny";
  scope: Scope;
  expiresAt: Date | null;
}

export interface AuthoritySnapshot {
  userId: string;
  active: boolean;
  roles: readonly RoleGrant[];
  overrides: readonly Override[];
}

export type Reason = "inactive" | "deny_override" | "allow_override" | "role" | "none";

export interface Decision {
  allowed: boolean;
  reason: Reason;
  /** The role grant or override that decided it. */
  via?: RoleGrant | Override;
}

export const platformTarget: Target = { school: null, grade: null, class: null, user: null };

export function scopeContains(scope: Scope, holder: string, target: Target): boolean {
  switch (scope.type) {
    case "platform":
      return true;
    case "school":
      return target.school !== null && scope.id === target.school;
    case "grade":
      return target.grade !== null && scope.id === target.grade;
    case "class":
      return target.class !== null && scope.id === target.class;
    case "self":
      return target.user !== null && target.user === holder;
  }
}

function isLive(o: Override, now: Date): boolean {
  return o.expiresAt === null || o.expiresAt.getTime() > now.getTime();
}

export function explain(
  snap: AuthoritySnapshot,
  permission: string,
  target: Target,
  now: Date = new Date(),
): Decision {
  if (!snap.active) return { allowed: false, reason: "inactive" };

  const matching = snap.overrides.filter(
    (o) =>
      o.permission === permission && isLive(o, now) && scopeContains(o.scope, snap.userId, target),
  );
  const deny = matching.find((o) => o.effect === "deny");
  if (deny) return { allowed: false, reason: "deny_override", via: deny };
  const allow = matching.find((o) => o.effect === "allow");
  if (allow) return { allowed: true, reason: "allow_override", via: allow };

  const role = snap.roles.find(
    (r) =>
      r.roleActive && r.permissions.has(permission) && scopeContains(r.scope, snap.userId, target),
  );
  if (role) return { allowed: true, reason: "role", via: role };
  return { allowed: false, reason: "none" };
}

export function evaluate(
  snap: AuthoritySnapshot,
  permission: string,
  target: Target,
  now?: Date,
): boolean {
  return explain(snap, permission, target, now).allowed;
}

/** A user target lives in several contexts (school + each class); allowed if any context allows. */
export function evaluateAny(
  snap: AuthoritySnapshot,
  permission: string,
  contexts: readonly Target[],
  now?: Date,
): boolean {
  return contexts.some((t) => evaluate(snap, permission, t, now));
}

/** Every permission the user holds somewhere (for menus and the effective-permission preview). */
export function heldPermissions(snap: AuthoritySnapshot, now: Date = new Date()): Set<string> {
  const held = new Set<string>();
  if (!snap.active) return held;
  for (const r of snap.roles) if (r.roleActive) r.permissions.forEach((p) => held.add(p));
  for (const o of snap.overrides)
    if (o.effect === "allow" && isLive(o, now)) held.add(o.permission);
  // A platform-wide deny removes the permission everywhere.
  for (const o of snap.overrides) {
    if (o.effect === "deny" && isLive(o, now) && o.scope.type === "platform")
      held.delete(o.permission);
  }
  return held;
}
