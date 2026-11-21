"use server";

import { revalidatePath } from "next/cache";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { getStorage, StorageNotConnectedError } from "@/lib/storage";
import { initLayout } from "@/lib/storage/layout";
import { deleteGoogleToken } from "@/lib/storage/secret";
import { createClient } from "@/lib/supabase/server";

async function authorize() {
  const actor = await getActor();
  if (!actor) throw new ActionError("signedOut");
  await assertCanWrite(actor, "integrations:manage", platformTarget);
}

/** Create the /LinguaPath folder layout (same as `npm run drive:init`). */
export async function createDriveFolders(): Promise<ActionResult<{ folders: number }>> {
  return runAction(async () => {
    await authorize();
    try {
      const ids = await initLayout(await getStorage());
      return { folders: Object.keys(ids).length };
    } catch (e) {
      if (e instanceof StorageNotConnectedError) throw new ActionError("driveNotConnected");
      throw e;
    }
  });
}

/** Forget the stored refresh token. (The Owner can also revoke access in their Google account.) */
export async function disconnectGoogle(): Promise<ActionResult> {
  return runAction(async () => {
    await authorize();
    await deleteGoogleToken();
    const db = await createClient();
    await db.rpc("log_audit", {
      p_action: "integration.google.disconnect",
      p_target_table: "integration_secrets",
    });
    revalidatePath("/[locale]/owner/integrations", "page");
  });
}
