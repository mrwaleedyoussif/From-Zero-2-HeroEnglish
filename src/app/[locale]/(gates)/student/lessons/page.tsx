import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { LessonTile } from "@/features/learning/components/lesson-tile";
import { fromMyTeacher, lessonsByIds, shownStatus } from "@/features/learning/lessons/queries";
import { recommendedFor } from "@/features/learning/lessons/recommended";
import { learnerProfile } from "@/features/learning/profile/queries";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";

/** Learner's lessons: "From my teacher" always first, then today's suggestions (SPEC §8, §9). */
export default async function StudentLessonsPage({
  params,
}: PageProps<"/[locale]/student/lessons">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "learning:self", "page.student.lessons");
  const t = await getTranslations("Learning");
  const [assigned, picks, profile] = await Promise.all([
    fromMyTeacher(actor),
    recommendedFor(actor),
    learnerProfile(actor.effective.id),
  ]);
  const suggested = await lessonsByIds(picks.map((p) => p.id));
  const reasons = new Map(picks.map((p) => [p.id, p.reasons]));

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      {!profile?.onboarded_at && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed p-4">
          <p>{t("tellUs")}</p>
          <Button asChild>
            <Link href="/student/profile">{t("startProfile")}</Link>
          </Button>
        </div>
      )}

      <section className="flex flex-col gap-3" data-section="from-teacher">
        <h2 className="text-xl font-semibold">{t("fromTeacher")}</h2>
        {assigned.length === 0 && <p className="text-muted-foreground">{t("noAssignments")}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {assigned.map((a) =>
            a.assignments?.lessons ? (
              <LessonTile
                key={a.assignments.id}
                lesson={a.assignments.lessons}
                status={shownStatus(a.status, a.assignments.due_at)}
                dueAt={a.status === "done" ? null : a.assignments.due_at}
                note={a.assignments.note}
                teacher={a.assignments.profiles?.full_name}
              />
            ) : null,
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3" data-section="recommended">
        <h2 className="text-xl font-semibold">{t("recommended")}</h2>
        {suggested.length === 0 && <p className="text-muted-foreground">{t("noSuggestions")}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {suggested.map((l) => (
            <LessonTile key={l.id} lesson={l} reasons={reasons.get(l.id)} />
          ))}
        </div>
      </section>
    </>
  );
}
