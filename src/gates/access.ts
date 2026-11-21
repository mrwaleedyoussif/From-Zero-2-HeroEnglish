import "server-only";
import { redirect } from "@/i18n/navigation";
import { canSomewhere } from "@/lib/auth/can";
import { requireActor } from "@/lib/auth/guard";
import type { Actor } from "@/lib/auth/session";
import { isVisible } from "@/lib/visibility/server";
import { gates } from "./index.generated";
import type { GateConfig } from "./types";

/** Gates the effective user may enter (permission + not hidden), best landing first. */
export async function enterableGates(actor: Actor): Promise<GateConfig[]> {
  const result: GateConfig[] = [];
  for (const gate of gates) {
    if (
      (await canSomewhere(actor, gate.permission)) &&
      (await isVisible(actor, `gate.${gate.key}`))
    ) {
      result.push(gate);
    }
  }
  return result.sort((a, b) => a.priority - b.priority);
}

/** Page guard for a gate: signed in and allowed in, else back to the landing page. */
export async function requireGate(locale: string, gate: GateConfig): Promise<Actor> {
  const actor = await requireActor(locale);
  const allowed = await enterableGates(actor);
  if (!allowed.some((g) => g.key === gate.key)) redirect({ href: "/home", locale });
  return actor;
}
