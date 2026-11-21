"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Mark one notification (or all, without an id) read; open its link when it has one. */
export async function readNotification(form: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor || actor.viewAs) return;
  const input = z
    .object({ id: z.guid().optional(), locale: z.enum(["en", "ar"]) })
    .parse({ id: form.get("id") || undefined, locale: form.get("locale") });
  const db = await createClient();
  // RLS limits this to the user's own rows; only read_at is writable.
  let q = db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  q = input.id ? q.eq("id", input.id) : q.eq("user_id", actor.real.id);
  await q;
  revalidatePath("/[locale]", "layout");
  if (input.id) {
    const { data } = await db.from("notifications").select("href").eq("id", input.id).maybeSingle();
    if (data?.href) redirect({ href: data.href, locale: input.locale });
  }
}
