import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, TextField } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { assignLessons } from "../teacher/assign-actions";
import type { AssignableLesson, RosterStudent } from "../teacher/queries";

type Set = { id: string; name: string; members: string[] };

/** Assign flow (SPEC §9): lesson(s) → students / group / team / class → due date, note, required. */
export async function AssignForm({
  classId,
  classCode,
  lessons,
  students,
  groups,
  teams,
  preselect,
}: {
  classId: string;
  classCode: string;
  lessons: AssignableLesson[];
  students: RosterStudent[];
  groups: Set[];
  teams: Set[];
  preselect?: string;
}) {
  const t = await getTranslations("Assign");
  const locale = await getLocale();
  const box =
    "flex items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10";
  const option = (type: string, id: string, label: string) => (
    <label key={`${type}:${id}`} className={box}>
      <input type="checkbox" name="target" value={`${type}:${id}`} className="size-4" />
      {label}
    </label>
  );

  return (
    <ActionForm action={assignLessons} successMessage="assigned" className="flex flex-col gap-4">
      <input type="hidden" name="class_id" value={classId} />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-medium">{t("lessons")}</legend>
        <div className="flex max-h-60 flex-col gap-1 overflow-y-auto rounded-md border p-2">
          {lessons.map((l) => (
            <label key={l.id} className={box} data-lesson={l.code}>
              <input
                type="checkbox"
                name="lesson_id"
                value={l.id}
                defaultChecked={l.id === preselect}
                className="size-4"
              />
              <code dir="ltr" className="text-xs">
                {l.code}
              </code>
              <span>{locale === "ar" ? l.title_ar : l.title_en}</span>
              {l.cefr && <span className="text-muted-foreground">({l.cefr})</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t("to")}</legend>
        <div className="flex flex-wrap gap-2">
          {option("class", classId, t("wholeClass", { cls: classCode }))}
        </div>
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => option("group", g.id, `${t("group")}: ${g.name}`))}
          </div>
        )}
        {teams.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {teams.map((g) => option("team", g.id, `${t("team")}: ${g.name}`))}
          </div>
        )}
        <details>
          <summary className="cursor-pointer text-sm text-primary">{t("pickStudents")}</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {students.map((s) => option("student", s.id, s.name))}
          </div>
        </details>
      </fieldset>
      <FormRow>
        <TextField idPrefix="assign" label={t("due")} name="due_on" type="date" />
        <TextField
          idPrefix="assign"
          label={t("note")}
          name="note"
          maxLength={500}
          className="min-w-64 flex-1"
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assign-required">{t("kind")}</Label>
          <NativeSelect id="assign-required" name="required" defaultValue="required">
            <NativeSelectOption value="required">{t("required")}</NativeSelectOption>
            <NativeSelectOption value="optional">{t("optional")}</NativeSelectOption>
          </NativeSelect>
        </div>
      </FormRow>
      <Button type="submit" className="self-start">
        {t("assign")}
      </Button>
    </ActionForm>
  );
}
