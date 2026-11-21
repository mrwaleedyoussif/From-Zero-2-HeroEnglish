import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, SelectField, TextField } from "@/components/field";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ClassPicker, pickClass } from "@/features/learning/components/class-picker";
import { SetCard } from "@/features/learning/components/set-card";
import { autoTeams, createSet } from "@/features/learning/teacher/actions";
import { groupsAndTeams, myClasses, roster } from "@/features/learning/teacher/queries";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";

/** Groups (by level or interest) and Kagan teams of 4 for a class; learner profiles (SPEC §8–9). */
export default async function GroupsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/teacher/groups">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "students:edit", "page.teacher.groups");
  const t = await getTranslations("Groups");
  const classes = await myClasses(actor, "students:edit");
  const cls = pickClass(classes, (await searchParams).class);
  if (!cls)
    return (
      <>
        <PageHeader title={t("title")} description={t("intro")} />
        <p className="text-muted-foreground">{t("noClasses")}</p>
      </>
    );
  const [students, sets] = await Promise.all([roster(cls.id), groupsAndTeams(cls.id)]);
  const editable = !actor.viewAs;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} description={t("intro")} />
      <ClassPicker classes={classes} current={cls.id} basePath="/teacher/groups" />
      {editable && (
        <ActionForm action={createSet} successMessage="saved">
          <input type="hidden" name="class_id" value={cls.id} />
          <FormRow>
            <TextField idPrefix="set" label={t("name")} name="name" required maxLength={60} />
            <SelectField
              idPrefix="set"
              label={t("kind")}
              name="kind"
              defaultValue="group"
              options={[
                { value: "group", label: t("group") },
                { value: "team", label: t("team") },
              ]}
            />
            <Button type="submit">{t("create")}</Button>
          </FormRow>
        </ActionForm>
      )}
      {(["group", "team"] as const).map((kind) => {
        const list = kind === "group" ? sets.groups : sets.teams;
        return (
          <section key={kind} className="flex flex-col gap-3" data-section={`${kind}s`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{t(kind === "group" ? "groups" : "teams")}</h2>
              {kind === "team" && editable && list.length === 0 && students.length >= 3 && (
                <ActionForm action={autoTeams} successMessage="saved">
                  <input type="hidden" name="class_id" value={cls.id} />
                  <Button type="submit" variant="outline" size="sm">
                    {t("autoTeams")}
                  </Button>
                </ActionForm>
              )}
            </div>
            {list.length === 0 && <p className="text-sm text-muted-foreground">{t("none")}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {list.map((s) => (
                <SetCard
                  key={s.id}
                  classId={cls.id}
                  kind={kind}
                  set={s}
                  students={students}
                  editable={editable}
                />
              ))}
            </div>
          </section>
        );
      })}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("students")}</h2>
        <ul className="grid gap-1 sm:grid-cols-2 md:grid-cols-3">
          {students.map((s) => (
            <li key={s.id}>
              <Link href={`/teacher/groups/${s.id}`} className="text-primary hover:underline">
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
