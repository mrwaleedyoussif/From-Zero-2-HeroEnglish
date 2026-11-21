import "server-only";
import { redirect } from "@/i18n/navigation";
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

/** Page guard: the effective user must hold the permission somewhere, else go home. */
export async function requirePermission(locale: string, permission: string): Promise<Actor> {
  const actor = await requireActor(locale);
  if (!(await canSomewhere(actor, permission))) {
    redirect({ href: "/home", locale });
  }
  return actor;
}
