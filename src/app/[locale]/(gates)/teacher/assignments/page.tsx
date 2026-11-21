import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { AssignForm } from "@/features/learning/components/assign-form";
import { AssignmentTracker } from "@/features/learning/components/assignment-tracker";
import { ClassPicker, pickClass } from "@/features/learning/components/class-picker";
import { SuggestionsPanel } from "@/features/learning/components/suggestions-panel";
import {
  assignableLessons,
  groupsAndTeams,
  myClasses,
  roster,
  skillNames,
  tracker,
} from "@/features/learning/teacher/queries";
import { classSuggestions } from "@/features/learning/teacher/suggestions";
import { requirePermission } from "@/lib/auth/guard";

/** Teacher assignments: assign, smart suggestions, and the progress tracker per class. */
export default async function AssignmentsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/teacher/assignments">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "lessons:assign", "page.teacher.assignments");
  const t = await getTranslations("Assign");
  const sp = await searchParams;
  const classes = await myClasses(actor, "lessons:assign");
  const cls = pickClass(classes, sp.class);
  if (!cls)
    return (
      <>
        <PageHeader title={t("title")} description={t("intro")} />
        <p className="text-muted-foreground">{t("noClasses")}</p>
      </>
    );

  const [students, sets, lessons, rows, skills] = await Promise.all([
    roster(cls.id),
    groupsAndTeams(cls.id),
    assignableLessons(actor),
    tracker(cls.id),
    skillNames(),
  ]);
  const suggestions = await classSuggestions(students, lessons);
  const readOnly = !!actor.viewAs;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} description={t("intro")} />
      <ClassPicker classes={classes} current={cls.id} basePath="/teacher/assignments" />
      {!readOnly && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("newAssignment", { cls: cls.code })}</h2>
          <AssignForm
            classId={cls.id}
            classCode={cls.code}
            lessons={lessons}
            students={students}
            groups={sets.groups}
            teams={sets.teams}
            preselect={typeof sp.lesson === "string" ? sp.lesson : undefined}
          />
        </section>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("suggested")}</h2>
        <SuggestionsPanel
          classId={cls.id}
          suggestions={readOnly ? [] : suggestions}
          students={students}
          lessons={lessons}
          skills={skills}
        />
      </section>
      <section className="flex flex-col gap-3" data-section="tracker">
        <h2 className="text-lg font-semibold">{t("tracker")}</h2>
        <AssignmentTracker classId={cls.id} rows={rows} students={students} canDelete={!readOnly} />
      </section>
    </div>
  );
}
