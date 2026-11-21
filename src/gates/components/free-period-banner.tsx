import { getTranslations } from "next-intl/server";
import { can } from "@/lib/auth/can";
import { schoolTarget } from "@/lib/auth/scope";
import type { Actor } from "@/lib/auth/session";
import { freePeriodEnded } from "@/lib/billing/entitlements";
import { createClient } from "@/lib/supabase/server";

/** SPEC §13: tell school leaders when their school's free period has ended. */
export async function FreePeriodBanner({ actor }: { actor: Actor }) {
  const schoolId = actor.effective.school_id;
  if (!schoolId || !(await can(actor, "schools:view", schoolTarget(schoolId)))) return null;
  const db = await createClient();
  const { data } = await db
    .from("subscriptions")
    .select("free_until")
    .eq("school_id", schoolId)
    .maybeSingle();
  const today = new Date().toISOString().slice(0, 10);
  if (!freePeriodEnded(data?.free_until ?? null, today)) return null;
  const t = await getTranslations("Gates");
  return (
    <div
      role="status"
      className="bg-warning px-4 py-2 text-center text-sm font-medium text-white print:hidden"
    >
      {t("freePeriodEnded", { date: data?.free_until ?? "" })}
    </div>
  );
}
