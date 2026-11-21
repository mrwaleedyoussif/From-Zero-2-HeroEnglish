import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatDate, localName } from "@/lib/i18n-names";
import type { AssignmentStatus, StudentLesson } from "../lessons/queries";
import type { Reason } from "../recommend/engine";

const STATUS_CLASS: Record<AssignmentStatus, string> = {
  not_started: "bg-muted text-foreground",
  in_progress: "bg-primary/15 text-foreground",
  done: "bg-success/20 text-foreground",
  overdue: "bg-destructive/15 text-destructive",
};

/** A lesson in the learner's lists: big tap target, level, format, why it's suggested or due. */
export async function LessonTile({
  lesson,
  status,
  dueAt,
  note,
  teacher,
  reasons,
}: {
  lesson: StudentLesson;
  status?: AssignmentStatus;
  dueAt?: string | null;
  note?: string | null;
  teacher?: string | null;
  reasons?: Reason[];
}) {
  const t = await getTranslations("Learning");
  const tl = await getTranslations("Library");
  const locale = await getLocale();
  const title = locale === "ar" ? lesson.title_ar : lesson.title_en;

  return (
    <Link
      href={`/student/lessons/${lesson.id}`}
      data-lesson={lesson.code}
      data-status={status}
      className="flex min-h-28 flex-col gap-2 rounded-xl border-2 bg-card p-4 transition hover:border-primary"
    >
      <div className="flex flex-wrap items-center gap-2">
        {lesson.cefr && <Badge variant="outline">{lesson.cefr}</Badge>}
        <Badge variant="secondary">{tl(`formats.${lesson.format}`)}</Badge>
        {status && (
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
            {t(`status.${status}`)}
          </span>
        )}
      </div>
      <span className="text-lg font-semibold">{title}</span>
      <span className="text-sm text-muted-foreground">
        {lesson.skills ? localName(lesson.skills, locale) : ""}
        {lesson.duration_min ? ` · ${tl("minutes", { n: lesson.duration_min })}` : ""}
        {dueAt ? ` · ${t("due", { date: formatDate(dueAt, locale) })}` : ""}
      </span>
      {(teacher || note) && (
        <span className="text-sm">
          {teacher ? `${teacher}: ` : ""}
          {note}
        </span>
      )}
      {reasons && reasons.length > 0 && (
        <span className="text-xs text-muted-foreground">
          {reasons
            .filter((r) => r !== "new")
            .map((r) => t(`reason.${r}`))
            .join(" · ")}
        </span>
      )}
    </Link>
  );
}
