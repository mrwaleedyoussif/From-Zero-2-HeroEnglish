"use server";

import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { type AiCheck, checkAi } from "@/lib/ai";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";

/** Owner: send one tiny request to the AI reader and say plainly whether it works. */
export async function testAiReader(): Promise<
  ActionResult<{ result: AiCheck; status?: number; model: string; detail?: string }>
> {
  return runAction(async () => {
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    await assertCanWrite(actor, "content:import", platformTarget);
    return checkAi();
  });
}
