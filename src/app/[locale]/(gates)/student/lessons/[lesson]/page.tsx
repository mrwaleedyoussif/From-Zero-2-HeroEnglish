import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { LessonPlayer } from "@/features/learning/components/lesson-player";
import { PracticeCheck } from "@/features/learning/components/practice-check";
import { choosePractice } from "@/features/learning/lessons/practice";
import { myLessonProgress, openableLesson } from "@/features/learning/lessons/queries";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { localName } from "@/lib/i18n-names";
import { createAdminClient } from "@/lib/supabase/admin";

/** Lesson player: the material by format, then a short practice check (SPEC §9). */
export default async function LessonPage({
  params,
}: PageProps<"/[locale]/student/lessons/[lesson]">) {
  const { locale, lesson: lessonId } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "learning:self", "page.student.lessons");
  if (!z.guid().safeParse(lessonId).success) notFound();
  const lesson = await openableLesson(actor, lessonId);
  if (!lesson) notFound();
  const t = await getTranslations("Learning");
  // Items hold answer keys (RLS hides them from learners): served by the server, keys stripped.
  const [items, progress] = await Promise.all([
    choosePractice(createAdminClient(), lesson, actor.effective.id),
    myLessonProgress(actor.effective.id, lesson.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title={locale === "ar" ? lesson.title_ar : lesson.title_en}
        description={[
          lesson.departments ? localName(lesson.departments, locale) : "",
          lesson.skills ? localName(lesson.skills, locale) : "",
          lesson.cefr ?? "",
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      {progress?.status === "done" && (
        <p className="rounded-md bg-muted p-3 text-sm">
          {t("doneBefore", { score: progress.best_score ?? "—" })}
        </p>
      )}
      <LessonPlayer lesson={lesson} />
      <PracticeCheck lessonId={lesson.id} items={items} readOnly={!!actor.viewAs} />
      <Button asChild variant="outline" className="self-start">
        <Link href="/student/lessons">{t("back")}</Link>
      </Button>
    </div>
  );
}
