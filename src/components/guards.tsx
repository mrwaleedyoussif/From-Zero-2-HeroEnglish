import type { ReactNode } from "react";
import { type CanTarget, can, canSomewhere } from "@/lib/auth/can";
import { getActor } from "@/lib/auth/session";
import { hasEntitlement } from "@/lib/billing/server";
import { isVisible } from "@/lib/visibility/server";

/** Render children only if the signed-in (effective) user holds the permission (at the target, or anywhere). */
export async function Can({
  perm,
  target,
  children,
  fallback = null,
}: {
  perm: string;
  target?: CanTarget;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const actor = await getActor();
  if (!actor) return fallback;
  const ok = target ? await can(actor, perm, target) : await canSomewhere(actor, perm);
  return ok ? children : fallback;
}

/** Render children only if the registry key is visible to the effective user. */
export async function Visible({
  k,
  children,
  fallback = null,
}: {
  k: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const actor = await getActor();
  if (!actor) return fallback;
  return (await isVisible(actor, k)) ? children : fallback;
}

/** Render children only if the user's school plan includes the key. */
export async function Entitled({
  k,
  children,
  fallback = null,
}: {
  k: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const actor = await getActor();
  if (!actor) return fallback;
  return (await hasEntitlement(actor, k)) ? children : fallback;
}
