"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";
import { assertCan } from "@/lib/auth/can";
import { VIEW_AS_COOKIE, getActor } from "@/lib/auth/session";
import { signViewAs } from "@/lib/auth/view-as-token";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const VIEW_AS_MINUTES = 60;
const input = z.object({ userId: z.guid(), locale: z.enum(locales) });

/** Start a read-only "view as" session (SPEC §3). Audited; expires after an hour. */
export async function startViewAs(form: FormData): Promise<void> {
  const { userId, locale } = input.parse({
    userId: form.get("userId"),
    locale: form.get("locale"),
  });
  const actor = await getActor();
  if (!actor) return redirect({ href: "/login", locale });
  if (actor.viewAs) return redirect({ href: "/home", locale }); // no nesting

  await assertCan({ ...actor, effective: actor.real }, "users:impersonate", { userId });
  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", userId)
    .single();
  await supabase.rpc("log_audit", {
    p_action: "view_as.start",
    p_target_table: "profiles",
    p_target_id: userId,
    p_school: target?.school_id ?? undefined,
  });

  const expires = new Date(Date.now() + VIEW_AS_MINUTES * 60_000);
  (await cookies()).set(
    VIEW_AS_COOKIE,
    signViewAs(serverEnv().ENCRYPTION_KEY, actor.real.id, userId, expires),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires,
    },
  );
  redirect({ href: "/home", locale });
}

export async function stopViewAs(form: FormData): Promise<void> {
  const locale = z.enum(locales).catch("en").parse(form.get("locale"));
  const actor = await getActor();
  (await cookies()).delete(VIEW_AS_COOKIE);
  if (actor?.viewAs) {
    const supabase = await createClient();
    await supabase.rpc("log_audit", {
      p_action: "view_as.stop",
      p_target_table: "profiles",
      p_target_id: actor.viewAs.id,
      p_school: actor.viewAs.school_id ?? undefined,
    });
    redirect({ href: `/owner/users/${actor.viewAs.id}`, locale });
  }
  redirect({ href: "/home", locale });
}
