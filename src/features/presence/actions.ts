"use server";

import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** "I am here": called by every signed-in page about once a minute while it is on screen. */
export async function touchPresence(): Promise<void> {
  const actor = await getActor();
  if (!actor || actor.viewAs) return;
  const db = await createClient();
  await db.rpc("touch_presence");
}
