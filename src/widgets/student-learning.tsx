import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonTile } from "@/features/learning/components/lesson-tile";
import { fromMyTeacher, lessonsByIds, shownStatus } from "@/features/learning/lessons/queries";
import { recommendedFor } from "@/features/learning/lessons/recommended";
import { Link } from "@/i18n/navigation";
import type { WidgetProps } from ".";

/** Student home: open work from the teacher (soonest due first). */
export async function StudentFromMyTeacherWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Registry");
  const tl = await getTranslations("Learning");
  const open = (await fromMyTeacher(actor)).filter((a) => a.status !== "done").slice(0, 3);
  return (
    <Card data-widget="widget.student.fromMyTeacher">
      <CardHeader>
        <CardTitle className="text-base">{t("widget.student.fromMyTeacher")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {open.length === 0 && <p className="text-sm text-muted-foreground">{tl("allDone")}</p>}
        {open.map((a) =>
          a.assignments?.lessons ? (
            <LessonTile
              key={a.assignments.id}
              lesson={a.assignments.lessons}
              status={shownStatus(a.status, a.assignments.due_at)}
              dueAt={a.assignments.due_at}
            />
          ) : null,
        )}
        <Button asChild variant="outline" className="self-start">
          <Link href="/student/lessons">{tl("allLessons")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** Student home: top suggestions for today. */
export async function StudentRecommendedWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Registry");
  const tl = await getTranslations("Learning");
  const picks = (await recommendedFor(actor)).slice(0, 2);
  const lessons = await lessonsByIds(picks.map((p) => p.id));
  return (
    <Card data-widget="widget.student.recommended">
      <CardHeader>
        <CardTitle className="text-base">{t("widget.student.recommended")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {lessons.length === 0 && (
          <p className="text-sm text-muted-foreground">{tl("noSuggestions")}</p>
        )}
        {lessons.map((l) => (
          <LessonTile key={l.id} lesson={l} reasons={picks.find((p) => p.id === l.id)?.reasons} />
        ))}
      </CardContent>
    </Card>
  );
}
