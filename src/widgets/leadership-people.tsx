import { getLocale, getTranslations } from "next-intl/server";
import { riskFlags } from "@/features/insights/analytics";
import { ExportLink } from "@/features/insights/components/export-link";
import { SupervisionTree } from "@/features/insights/components/supervision-tree";
import { teacherUsage, visibleStudents } from "@/features/insights/queries";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/i18n-names";
import type { WidgetProps } from ".";
import { WidgetCard } from "./widget-card";

/** Leadership home: teachers' platform usage (supervision graph decides who is listed). */
export async function LeadershipTeacherUsageWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Insights");
  const locale = await getLocale();
  const school = actor.effective.school_id;
  const rows = school ? await teacherUsage(school) : [];
  return (
    <WidgetCard widgetKey="widget.leadership.teacherUsage" wide>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noTeachers")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-teacher-usage>
            <thead>
              <tr className="border-b">
                {[
                  t("teacher"),
                  t("classes"),
                  t("assignments30h"),
                  t("kudos30h"),
                  t("lastAssignment"),
                  t("lastSignIn"),
                ].map((h) => (
                  <th key={h} scope="col" className="px-2 py-1 text-start font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.teacher_id} className="border-b last:border-0">
                  <td className="px-2 py-1">{r.full_name}</td>
                  <td className="px-2 py-1 tabular-nums">{r.classes}</td>
                  <td className="px-2 py-1 tabular-nums">{r.assignments_30d}</td>
                  <td className="px-2 py-1 tabular-nums">{r.kudos_30d}</td>
                  <td className="px-2 py-1">
                    {r.last_assignment_at ? formatDate(r.last_assignment_at, locale) : "—"}
                  </td>
                  <td className="px-2 py-1">
                    {r.last_sign_in_at ? formatDate(r.last_sign_in_at, locale) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {school && <ExportLink dataset="teachers" params={{ school }} />}
    </WidgetCard>
  );
}

/** Leadership home: learners needing intervention across the school. */
export async function LeadershipInterventionWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Insights");
  const now = new Date();
  const risky = (await visibleStudents(actor.effective.school_id))
    .map((s) => ({ ...s, flags: riskFlags(s, now) }))
    .filter((s) => s.flags.length >= 2 || s.flags.includes("falling"));
  return (
    <WidgetCard widgetKey="widget.leadership.interventionList">
      {risky.length === 0 && <p className="text-sm text-muted-foreground">{t("noRisk")}</p>}
      <ul className="flex flex-col gap-1 text-sm">
        {risky.slice(0, 10).map((s) => (
          <li
            key={`${s.class.class_id}-${s.student_id}`}
            className="flex flex-wrap justify-between gap-2"
          >
            <Link
              href={`/leadership/insights?grade=${s.class.grade_id}&class=${s.class.class_id}&student=${s.student_id}`}
              className="text-primary hover:underline"
            >
              {s.full_name} <span className="text-muted-foreground">({s.class.class_code})</span>
            </Link>
            <span className="text-destructive">
              {s.flags.map((f) => t(`risk.${f}`)).join(", ")}
            </span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

/** Leadership home: who supervises whom. */
export async function LeadershipSupervisionWidget({ actor }: WidgetProps) {
  const school = actor.effective.school_id;
  return (
    <WidgetCard widgetKey="widget.leadership.supervisionTree" href="/leadership/supervision">
      {school ? <SupervisionTree schoolId={school} depth={2} /> : null}
    </WidgetCard>
  );
}
