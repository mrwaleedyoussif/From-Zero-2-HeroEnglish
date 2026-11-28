import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonTile } from "@/features/learning/components/lesson-tile";
import { fromMyTeacher, lessonsByIds, shownStatus } from "@/features/learning/lessons/queries";
import { recommendedUnits } from "@/features/units/recommended";
import { recommendedFor } from "@/features/learning/lessons/recommended";
import { Link } from "@/i18n/navigation";
import type { WidgetProps } from ".";

/** Student home: open work from the teacher (soonest due first). */
export async function StudentFromMyTeacherWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Registry");
  const tl = await getTranslations("Learning");
  const tu = await getTranslations("Units");
  const [work, picks] = await Promise.all([fromMyTeacher(actor), recommendedUnits(actor)]);
  const open = work.filter((a) => a.status !== "done").slice(0, 3);
  const units = picks.filter((u) => !u.done).slice(0, 4);
  return (
    <Card data-widget="widget.student.fromMyTeacher">
      <CardHeader>
        <CardTitle className="text-base">{t("widget.student.fromMyTeacher")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {units.map((u) => (
          <Link
            key={u.id}
            href={`/student/units/${u.strand}/${u.id}`}
            data-recommended={u.id}
            className="flex flex-col rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 hover:bg-primary/10"
          >
            <span className="font-semibold">⭐ {u.title}</span>
            <span className="text-sm text-muted-foreground">
              {tu("recommend.from", { name: u.from })}
              {u.note ? ` · ${u.note}` : ""}
            </span>
          </Link>
        ))}
        {open.length + units.length === 0 && (
          <p className="text-sm text-muted-foreground">{tl("allDone")}</p>
        )}
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
