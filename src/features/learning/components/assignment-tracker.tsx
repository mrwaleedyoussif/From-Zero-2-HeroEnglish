import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/i18n-names";
import { type AssignmentStatus, shownStatus } from "../lessons/queries";
import { deleteAssignment } from "../teacher/assign-actions";
import type { RosterStudent, TrackerRow } from "../teacher/queries";

const ORDER: AssignmentStatus[] = ["done", "in_progress", "not_started", "overdue"];
const DOT: Record<AssignmentStatus, string> = {
  done: "bg-success",
  in_progress: "bg-primary",
  not_started: "bg-muted-foreground/40",
  overdue: "bg-destructive",
};

/** Progress per assignment (SPEC §9): not started / in progress / done / overdue, score, time. */
export async function AssignmentTracker({
  classId,
  rows,
  students,
  canDelete,
}: {
  classId: string;
  rows: TrackerRow[];
  students: RosterStudent[];
  canDelete: boolean;
}) {
  const t = await getTranslations("Assign");
  const locale = await getLocale();
  const name = new Map(students.map((s) => [s.id, s.name]));
  if (rows.length === 0) return <p className="text-muted-foreground">{t("noneYet")}</p>;

  return (
    <div className="flex flex-col gap-3">
      {rows.map((a) => {
        const progress = a.assignment_progress.map((p) => ({
          ...p,
          shown: shownStatus(p.status, a.due_at),
        }));
        const counts = Object.fromEntries(
          ORDER.map((s) => [s, progress.filter((p) => p.shown === s).length]),
        );
        return (
          <details key={a.id} className="rounded-lg border p-3" data-assignment={a.lessons?.code}>
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {locale === "ar" ? a.lessons?.title_ar : a.lessons?.title_en}
                {a.due_at ? ` · ${t("dueOn", { date: formatDate(a.due_at, locale) })}` : ""}
                {a.required ? "" : ` · ${t("optional")}`}
              </span>
              <span className="flex flex-wrap gap-3 text-sm" data-counts>
                {ORDER.map((s) => (
                  <span key={s} className="flex items-center gap-1" data-count={s}>
                    <span className={`size-2.5 rounded-full ${DOT[s]}`} aria-hidden />
                    {t(`status.${s}`)}: {counts[s]}
                  </span>
                ))}
              </span>
            </summary>
            {a.note && <p className="mt-2 text-sm text-muted-foreground">{a.note}</p>}
            <table className="mt-2 w-full text-sm">
              <tbody>
                {progress
                  .sort((x, y) =>
                    (name.get(x.student_id) ?? "").localeCompare(name.get(y.student_id) ?? ""),
                  )
                  .map((p) => (
                    <tr key={p.student_id} className="border-t" data-student-status={p.shown}>
                      <td className="py-1">{name.get(p.student_id) ?? "—"}</td>
                      <td>{t(`status.${p.shown}`)}</td>
                      <td>{p.score === null ? "" : `${p.score}%`}</td>
                      <td>
                        {p.time_spent_sec
                          ? t("minutes", { n: Math.max(1, Math.round(p.time_spent_sec / 60)) })
                          : ""}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {canDelete && (
              <ActionForm action={deleteAssignment} successMessage="removed" className="mt-2">
                <input type="hidden" name="class_id" value={classId} />
                <input type="hidden" name="id" value={a.id} />
                <Button type="submit" size="sm" variant="outline">
                  {t("delete")}
                </Button>
              </ActionForm>
            )}
          </details>
        );
      })}
    </div>
  );
}
