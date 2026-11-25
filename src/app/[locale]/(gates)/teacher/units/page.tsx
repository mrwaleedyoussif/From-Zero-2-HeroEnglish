import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { ProgressRing } from "@/components/progress-ring";
import type { Answered } from "@/features/units/queries";
import { requirePermission } from "@/lib/auth/guard";
import { formatDate } from "@/lib/i18n-names";
import { createClient } from "@/lib/supabase/server";
import "@/features/units/components/units.css";

/**
 * Course units, per learner: units started and finished, first-try score, speech practice and
 * the saved writing. Row security shows only learners the member of staff may see.
 */
export default async function TeacherUnitsPage({ params }: PageProps<"/[locale]/teacher/units">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "students:view", "page.teacher.units");
  const t = await getTranslations("Units");
  const db = await createClient();
  const { data } = await db
    .from("course_unit_progress")
    .select(
      "student_id, unit_id, correct, total, completed_at, writing, answers, updated_at, profiles(full_name), course_units(title, level, unit, strand)",
    )
    .order("updated_at", { ascending: false })
    .limit(2000);
  const byStudent = new Map<string, NonNullable<typeof data>>();
  for (const row of data ?? [])
    byStudent.set(row.student_id, [...(byStudent.get(row.student_id) ?? []), row]);
  const speech = (answers: unknown) => {
    const scores = Object.entries((answers ?? {}) as Record<string, Answered>)
      .filter(([k]) => k.startsWith("speech:"))
      .map(([, a]) => a.score ?? 0);
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  };

  return (
    <>
      <PageHeader title={t("teacherTitle")} description={t("teacherIntro")} />
      {byStudent.size === 0 && <p className="text-muted-foreground">{t("teacherNone")}</p>}
      {[...byStudent.entries()].map(([id, rows]) => {
        const correct = rows.reduce((n, r) => n + r.correct, 0);
        const total = rows.reduce((n, r) => n + r.total, 0);
        const finished = rows.filter((r) => r.completed_at).length;
        return (
          <details
            key={id}
            data-learner={id}
            data-hue="blue"
            className="unit-panel rounded-2xl p-4"
          >
            <summary className="flex cursor-pointer flex-wrap items-center gap-4">
              <ProgressRing
                size={56}
                value={total ? (correct / total) * 100 : null}
                label={t("teacherScore")}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <strong className="text-lg">{rows[0]?.profiles?.full_name ?? "—"}</strong>
                <span className="text-sm text-muted-foreground">
                  {t("teacherSummary", { started: rows.length, finished })} ·{" "}
                  {formatDate(rows[0]?.updated_at ?? "", locale)}
                </span>
              </span>
            </summary>
            <ul className="mt-4 flex flex-col gap-3">
              {rows.map((r) => (
                <li key={r.unit_id} className="rounded-xl border border-border bg-background p-3">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="unit-chip rounded-full px-2 text-sm">
                      {r.course_units?.strand} {r.course_units?.level}
                    </span>
                    {t("unitN", { n: r.course_units?.unit ?? 0 })} · {r.course_units?.title}
                    {r.completed_at && <span aria-label={t("done")}>✅</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {r.total > 0 && t("teacherFirstTry", { correct: r.correct, total: r.total })}
                    {speech(r.answers) !== null &&
                      ` · ${t("teacherSpeech", { n: speech(r.answers) ?? 0 })}`}
                  </p>
                  {r.writing && (
                    <p
                      dir="ltr"
                      className="mt-2 rounded-lg bg-muted p-3 text-start whitespace-pre-line"
                    >
                      {r.writing}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </>
  );
}
