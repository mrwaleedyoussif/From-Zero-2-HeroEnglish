import { getTranslations } from "next-intl/server";
import { ProgressRing } from "@/components/progress-ring";
import { riskFlags } from "@/features/insights/analytics";
import { ChartFrame } from "@/features/insights/components/chart-frame";
import { BarChart, CEFR_BG } from "@/features/insights/components/charts";
import {
  classStats,
  skillMatrix,
  studentStats,
  visibleStudents,
} from "@/features/insights/queries";
import { Link } from "@/i18n/navigation";
import type { WidgetProps } from ".";
import { WidgetCard } from "./widget-card";

/** Teacher home: roster of the first class with CEFR and θ trend. */
export async function TeacherClassRosterWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Insights");
  const cls = (await classStats(actor.effective.school_id))[0];
  const rows = cls ? await studentStats(cls.class_id) : [];
  return (
    <WidgetCard
      widgetKey="widget.teacher.classRoster"
      href={cls ? `/teacher/insights?class=${cls.class_id}&grade=${cls.grade_id}` : undefined}
    >
      {!cls && <p className="text-sm text-muted-foreground">{t("nothingInScope")}</p>}
      {cls && <p className="text-sm font-medium">{cls.class_code}</p>}
      <ul className="flex flex-col gap-1 text-sm">
        {rows.slice(0, 12).map((s) => {
          const g =
            s.theta_now === null || s.theta_first === null
              ? null
              : Number(s.theta_now) - Number(s.theta_first);
          return (
            <li key={s.student_id} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <ProgressRing
                  size={36}
                  value={s.accuracy_7d === null ? null : Number(s.accuracy_7d)}
                  label={`${s.full_name} · ${t("accuracy")}`}
                />
                {s.full_name}
              </span>
              <span className="flex items-center gap-2">
                {s.cefr_now && (
                  <span
                    className={`rounded px-1.5 text-xs font-semibold ${CEFR_BG[s.cefr_now] ?? ""}`}
                  >
                    {s.cefr_now}
                  </span>
                )}
                <span aria-label={t("growth")}>
                  {g === null ? "—" : g > 0 ? "▲" : g < 0 ? "▼" : "•"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}

/** Teacher home: learners inactive 7 days, with falling accuracy or overdue work. */
export async function TeacherAtRiskWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Insights");
  const now = new Date();
  const risky = (await visibleStudents(actor.effective.school_id))
    .map((s) => ({ ...s, flags: riskFlags(s, now) }))
    .filter((s) => s.flags.length > 0);
  return (
    <WidgetCard widgetKey="widget.teacher.atRiskStudents">
      {risky.length === 0 && <p className="text-sm text-muted-foreground">{t("noRisk")}</p>}
      <ul className="flex flex-col gap-1 text-sm" data-at-risk={risky.length}>
        {risky.slice(0, 10).map((s) => (
          <li
            key={`${s.class.class_id}-${s.student_id}`}
            className="flex flex-wrap justify-between gap-2"
          >
            <Link
              href={`/teacher/insights?grade=${s.class.grade_id}&class=${s.class.class_id}&student=${s.student_id}`}
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

/** Teacher home: average level per skill in the first class (details in Insights). */
export async function TeacherSkillHeatmapWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Insights");
  const cls = (await classStats(actor.effective.school_id))[0];
  const matrix = cls ? await skillMatrix(cls.class_id) : [];
  const bySkill = new Map<string, number[]>();
  for (const m of matrix)
    bySkill.set(m.skill_code, [...(bySkill.get(m.skill_code) ?? []), Number(m.theta)]);
  const rows = [...bySkill].map(([skill, v]) => ({
    skill,
    avg: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100,
  }));
  return (
    <WidgetCard
      widgetKey="widget.teacher.skillHeatmap"
      href={cls ? `/teacher/insights?class=${cls.class_id}&grade=${cls.grade_id}` : undefined}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noSkills")}</p>
      ) : (
        <ChartFrame
          id="skills"
          title={cls?.class_code ?? ""}
          summary={t("skillsSummary")}
          table={{ headers: [t("skill"), "θ"], rows: rows.map((r) => [r.skill, r.avg]) }}
        >
          <BarChart
            max={8}
            tone="secondary"
            rows={rows.map((r) => ({
              label: r.skill,
              value: r.avg + 4,
              display: r.avg.toFixed(2),
            }))}
          />
        </ChartFrame>
      )}
    </WidgetCard>
  );
}
