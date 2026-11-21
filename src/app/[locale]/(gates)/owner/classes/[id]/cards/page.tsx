import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { ClassCards } from "@/features/users/components/class-cards";
import { can } from "@/lib/auth/can";
import { requirePermission } from "@/lib/auth/guard";
import { classTarget } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function ClassCardsPage({
  params,
}: PageProps<"/[locale]/owner/classes/[id]/cards">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "users:reset_pin", "page.owner.users");
  if (!(await can(actor, "users:reset_pin", await classTarget(id)))) notFound();
  const db = await createClient();
  const { data: cls } = await db
    .from("classes")
    .select("code, schools(code), enrolments(count)")
    .eq("id", id)
    .eq("enrolments.status", "active")
    .maybeSingle();
  if (!cls) notFound();
  const t = await getTranslations("Cards");

  return (
    <>
      <div className="print:hidden">
        <PageHeader title={t("title", { class: cls.code })} description={t("intro")} />
      </div>
      {actor.viewAs ? (
        <p>{t("readOnly")}</p>
      ) : (
        <ClassCards classId={id} studentCount={cls.enrolments[0]?.count ?? 0} />
      )}
    </>
  );
}
