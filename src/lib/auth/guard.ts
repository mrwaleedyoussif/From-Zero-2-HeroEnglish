import "server-only";
import { redirect } from "@/i18n/navigation";
import { requireVisible } from "@/lib/visibility/server";
import { canSomewhere } from "./can";
import { type Actor, getActor } from "./session";

/** Signed-in actor or redirect to the sign-in page. */
export async function requireActor(locale: string): Promise<Actor> {
  const actor = await getActor();
  if (!actor) {
    redirect({ href: "/login", locale });
    throw new Error("unreachable");
  }
  return actor;
}

/**
 * Page guard: the effective user must hold the permission somewhere (else go home) and,
 * when a registry page key is given, the page must be visible to them (else 404).
 */
export async function requirePermission(
  locale: string,
  permission: string,
  pageKey?: string,
): Promise<Actor> {
  const actor = await requireActor(locale);
  if (!(await canSomewhere(actor, permission))) {
    redirect({ href: "/home", locale });
  }
  if (pageKey) await requireVisible(actor, pageKey);
  return actor;
}
