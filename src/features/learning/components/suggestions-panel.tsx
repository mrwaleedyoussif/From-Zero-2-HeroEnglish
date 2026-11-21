import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { localName } from "@/lib/i18n-names";
import type { Suggestion } from "../recommend/suggest";
import { assignLessons } from "../teacher/assign-actions";
import type { AssignableLesson, RosterStudent } from "../teacher/queries";

/** "These N students are weak in <skill> → suggested lessons", approved with one click (SPEC §9). */
export async function SuggestionsPanel({
  classId,
  suggestions,
  students,
  lessons,
  skills,
}: {
  classId: string;
  suggestions: Suggestion[];
  students: RosterStudent[];
  lessons: AssignableLesson[];
  skills: Map<string, { name_en: string; name_ar: string }>;
}) {
  const t = await getTranslations("Assign");
  const locale = await getLocale();
  const name = new Map(students.map((s) => [s.id, s.name]));
  const lesson = new Map(lessons.map((l) => [l.id, l]));
  if (suggestions.length === 0)
    return <p className="text-muted-foreground">{t("noSuggestions")}</p>;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {suggestions.map((s) => {
        const skill = skills.get(s.skillId);
        return (
          <div
            key={s.skillId}
            className="flex flex-col gap-2 rounded-lg border p-3"
            data-suggestion
          >
            <p className="font-medium">
              {t("weakIn", {
                count: s.studentIds.length,
                skill: skill ? localName(skill, locale) : "",
              })}
            </p>
            <p className="text-sm text-muted-foreground">
              {s.studentIds.map((id) => name.get(id)).join(", ")}
            </p>
            <ul className="text-sm">
              {s.lessonIds.map((id) => {
                const l = lesson.get(id);
                return <li key={id}>• {l ? (locale === "ar" ? l.title_ar : l.title_en) : id}</li>;
              })}
            </ul>
            <ActionForm action={assignLessons} successMessage="assigned">
              <input type="hidden" name="class_id" value={classId} />
              <input type="hidden" name="required" value="required" />
              {s.lessonIds.slice(0, 1).map((id) => (
                <input key={id} type="hidden" name="lesson_id" value={id} />
              ))}
              {s.studentIds.map((id) => (
                <input key={id} type="hidden" name="target" value={`student:${id}`} />
              ))}
              <Button type="submit" size="sm">
                {t("assignFirst")}
              </Button>
            </ActionForm>
          </div>
        );
      })}
    </div>
  );
}
