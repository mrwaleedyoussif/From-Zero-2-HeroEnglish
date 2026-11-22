import { getLocale, getTranslations } from "next-intl/server";
import { ChartFrame } from "@/features/insights/components/chart-frame";
import { BarChart } from "@/features/insights/components/charts";
import { formatDate, localName } from "@/lib/i18n-names";
import { createClient } from "@/lib/supabase/server";
import type { WidgetProps } from ".";
import { WidgetCard } from "./widget-card";

/** Start of the four-week window (server time). */
function fourWeeksAgo(): string {
  return new Date(Date.now() - 28 * 86_400_000).toISOString();
}

/** Student home: my level over time and lessons finished in the last four weeks. */
export async function StudentProgressWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Insights");
  const locale = await getLocale();
  const db = await createClient();
  const since = fourWeeksAgo();
  const [{ data: history }, { count }] = await Promise.all([
    db
      .from("ability_estimates")
      .select("theta, cefr, measured_at, departments(name_en, name_ar)")
      .eq("student_id", actor.effective.id)
      .is("skill_id", null)
      .order("measured_at")
      .limit(10),
    db
      .from("lesson_progress")
      .select("lesson_id", { count: "exact", head: true })
      .eq("student_id", actor.effective.id)
      .eq("status", "done")
      .gte("completed_at", since),
  ]);
  const points = (history ?? []).map((h) => ({
    label: `${formatDate(h.measured_at, locale)}${h.departments ? ` · ${localName(h.departments, locale)}` : ""}`,
    theta: Number(h.theta),
    cefr: h.cefr,
  }));
  return (
    <WidgetCard widgetKey="widget.student.progress">
      <p className="text-lg">
        <span aria-hidden>📚</span> {t("lessonsFourWeeks", { n: count ?? 0 })}
      </p>
      {points.length > 0 && (
        <ChartFrame
          id="my-progress"
          title={t("myLevelOverTime")}
          summary={t("historySummary")}
          table={{
            headers: [t("date"), t("level"), "θ"],
            rows: points.map((p) => [p.label, p.cefr, p.theta.toFixed(2)]),
          }}
        >
          <BarChart
            max={8}
            rows={points.map((p) => ({
              label: p.label,
              value: p.theta + 4,
              display: p.cefr ?? "—",
            }))}
          />
        </ChartFrame>
      )}
    </WidgetCard>
  );
}
