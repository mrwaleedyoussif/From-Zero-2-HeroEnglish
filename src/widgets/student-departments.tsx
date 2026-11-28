import { getLocale, getTranslations } from "next-intl/server";
import { audienceFor } from "@/features/departments/catalog";
import { DepartmentGrid } from "@/features/departments/components/department-grid";
import { allDepartments } from "@/features/departments/states";
import { canSomewhere } from "@/lib/auth/can";
import { createClient } from "@/lib/supabase/server";
import type { WidgetProps } from ".";

/** Student home: the departments their school (or the general learners' group) offers. */
export async function StudentDepartmentsWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Departments");
  const locale = (await getLocale()) === "ar" ? "ar" : "en";
  // Teachers and other staff who may see content: every department, each one open to them.
  if (await canSomewhere(actor, "content:view"))
    return (
      <section
        data-widget="widget.student.departments"
        className="flex min-w-0 flex-col gap-3 md:col-span-2 xl:col-span-3"
      >
        <h2 className="text-base font-semibold">{t("allForStaff")}</h2>
        <DepartmentGrid audience="all" all={allDepartments()} locale={locale} linked />
      </section>
    );
  const schoolId = actor.effective.school_id;
  if (!schoolId) return null;
  const db = await createClient();
  const { data: school } = await db
    .from("schools")
    .select("code, name_en")
    .eq("id", schoolId)
    .maybeSingle();
  const audience = school && audienceFor(school);
  if (!audience) return null;

  return (
    <section
      data-widget="widget.student.departments"
      className="flex min-w-0 flex-col gap-3 md:col-span-2 xl:col-span-3"
    >
      <h2 className="text-base font-semibold">{t("mine")}</h2>
      <DepartmentGrid audience={audience} locale={locale} linked />
    </section>
  );
}
