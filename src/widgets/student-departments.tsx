import { getLocale, getTranslations } from "next-intl/server";
import { audienceFor } from "@/features/departments/catalog";
import { DepartmentGrid } from "@/features/departments/components/department-grid";
import { createClient } from "@/lib/supabase/server";
import type { WidgetProps } from ".";

/** Student home: the departments their school (or the general learners' group) offers. */
export async function StudentDepartmentsWidget({ actor }: WidgetProps) {
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
  const t = await getTranslations("Departments");
  const locale = (await getLocale()) === "ar" ? "ar" : "en";

  return (
    <section
      data-widget="widget.student.departments"
      className="flex min-w-0 flex-col gap-3 md:col-span-2 xl:col-span-3"
    >
      <h2 className="text-base font-semibold">{t("mine")}</h2>
      <DepartmentGrid audience={audience} locale={locale} />
    </section>
  );
}
