import "server-only";
import { loadAuthority } from "./authority";
import { evaluate, evaluateAny, heldPermissions, type Target } from "./engine";
import { userContexts } from "./scope";
import type { Actor } from "./session";

/** What a permission is checked against: a resolved target, or a user (resolved to their contexts). */
export type CanTarget = Target | { userId: string };

export class ForbiddenError extends Error {
  constructor(permission: string) {
    super(`Forbidden: ${permission}`);
    this.name = "ForbiddenError";
  }
}

export class ReadOnlyError extends Error {
  constructor() {
    super("Read-only while viewing as another user");
    this.name = "ReadOnlyError";
  }
}

/**
 * can(actor, permission, target) — app-side half of "authorize twice" (RLS is the other).
 * Evaluates the effective user's permissions, so "view as" shows exactly what they would see.
 */
export async function can(actor: Actor, permission: string, target: CanTarget): Promise<boolean> {
  const authority = await loadAuthority(actor.effective.id);
  if ("userId" in target) {
    return evaluateAny(authority, permission, await userContexts(target.userId));
  }
  return evaluate(authority, permission, target);
}

/** Holds the permission in at least one scope — for showing nav items and pages, not for data access. */
export async function canSomewhere(actor: Actor, permission: string): Promise<boolean> {
  return heldPermissions(await loadAuthority(actor.effective.id)).has(permission);
}

export async function assertCan(
  actor: Actor,
  permission: string,
  target: CanTarget,
): Promise<void> {
  if (!(await can(actor, permission, target))) throw new ForbiddenError(permission);
}

/** For mutations: also refuses while viewing as someone else. */
export async function assertCanWrite(
  actor: Actor,
  permission: string,
  target: CanTarget,
): Promise<void> {
  if (actor.viewAs) throw new ReadOnlyError();
  await assertCan(actor, permission, target);
}
