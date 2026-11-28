import { getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { GENERAL_CODE } from "../general";
import { assignLearners, unassignLearner } from "../teacher-actions";

/**
 * Owner: which teacher has which general learners. A learner with no teacher is seen by the
 * Owner alone; ticking learners and choosing a teacher gives them to that teacher.
 */
export async function LearnerTeachers({ readOnly }: { readOnly: boolean }) {
  const t = await getTranslations("OwnerLearners");
  const db = await createClient();
  const { data: school } = await db
    .from("schools")
    .select("id")
    .eq("code", GENERAL_CODE)
    .maybeSingle();
  if (!school) return null;
  const [{ data: learners }, { data: staff }, { data: links }] = await Promise.all([
    db
      .from("profiles")
      .select("id, full_name, email")
      .eq("school_id", school.id)
      .eq("kind", "student")
      .eq("status", "active")
      .order("full_name")
      .limit(500),
    db
      .from("profiles")
      .select("id, full_name, email")
      .eq("kind", "staff")
      .eq("status", "active")
      .order("full_name")
      .limit(500),
    db
      .from("enrolments")
      .select(
        "student_id, classes!inner(teaching_assignments(teacher_id, profiles!teaching_assignments_teacher_id_fkey(full_name)))",
      )
      .eq("school_id", school.id)
      .eq("status", "active")
      .limit(2000),
  ]);
  const teachersOf = (id: string) =>
    (links ?? [])
      .filter((l) => l.student_id === id)
      .flatMap((l) => l.classes.teaching_assignments)
      .map((a) => ({ id: a.teacher_id, name: a.profiles?.full_name ?? "" }));
  return (
    <Card data-learner-teachers>
      <CardHeader>
        <CardTitle>{t("teachersTitle")}</CardTitle>
        <CardDescription>{t("teachersHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!learners?.length && <p className="text-sm text-muted-foreground">{t("noLearners")}</p>}
        <ActionForm action={assignLearners} className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {(learners ?? []).map((l) => (
              <li
                key={l.id}
                data-learner={l.email}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border p-3"
              >
                <label className="flex min-w-0 flex-1 items-center gap-2 font-medium">
                  {!readOnly && <input type="checkbox" name="learner" value={l.id} />}
                  {l.full_name}
                  <span dir="ltr" className="truncate text-sm font-normal text-muted-foreground">
                    {l.email}
                  </span>
                </label>
                <span className="text-sm" data-teachers={teachersOf(l.id).length}>
                  {teachersOf(l.id).length === 0
                    ? t("onlyYou")
                    : t("seenBy", {
                        names: teachersOf(l.id)
                          .map((x) => x.name)
                          .join(", "),
                      })}
                </span>
              </li>
            ))}
          </ul>
          {!readOnly && !!learners?.length && (
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium">
                {t("teacher")}
                <select
                  name="teacher"
                  required
                  defaultValue=""
                  className="min-h-10 rounded-md border border-input bg-background px-3"
                >
                  <option value="" disabled>
                    {t("chooseTeacher")}
                  </option>
                  {(staff ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" data-assign-teacher>
                {t("assign")}
              </Button>
            </div>
          )}
        </ActionForm>
        {!readOnly &&
          (learners ?? []).flatMap((l) =>
            teachersOf(l.id).map((x) => (
              <ActionForm
                key={`${l.id}-${x.id}`}
                action={unassignLearner}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <input type="hidden" name="learner" value={l.id} />
                <input type="hidden" name="teacher" value={x.id} />
                <span>{t("pair", { learner: l.full_name, teacher: x.name })}</span>
                <Button type="submit" size="sm" variant="outline" data-unassign>
                  {t("takeBack")}
                </Button>
              </ActionForm>
            )),
          )}
      </CardContent>
    </Card>
  );
}
