import { getLocale, getTranslations } from "next-intl/server";
import { coachingLogs } from "@/features/coaching/queries";
import { growthVsAverage } from "@/features/insights/analytics";
import { ChartFrame } from "@/features/insights/components/chart-frame";
import { BarChart } from "@/features/insights/components/charts";
import { classStats, schoolAverages, teacherUsage } from "@/features/insights/queries";
import { formatDate } from "@/lib/i18n-names";
import type { WidgetProps } from ".";
import { WidgetCard } from "./widget-card";

/** Coach home: teachers they support with assignment usage and last sign-in. */
export async function CoachSupportedTeachersWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Insights");
  const locale = await getLocale();
  const school = actor.effective.school_id;
  const rows = school ? await teacherUsage(school) : [];
  return (
    <WidgetCard widgetKey="widget.coach.supportedTeachers" href="/coach/insights">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("noTeachers")}</p>}
      <ul className="flex flex-col gap-1 text-sm">
        {rows.map((r) => (
          <li
            key={r.teacher_id}
            className="flex flex-wrap justify-between gap-2"
            data-teacher={r.full_name}
          >
            <span>{r.full_name}</span>
            <span className="text-muted-foreground">
              {t("assignments30", { n: r.assignments_30d })} ·{" "}
              {r.last_sign_in_at
                ? t("lastSeen", { date: formatDate(r.last_sign_in_at, locale) })
                : t("neverSignedIn")}
            </span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

/** Coach home: open follow-ups from the coaching log, soonest first. */
export async function CoachFollowUpsWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Insights");
  const locale = await getLocale();
  const open = (await coachingLogs())
    .filter((l) => l.coach_id === actor.effective.id && l.status === "open" && l.follow_up_on)
    .sort((a, b) => (a.follow_up_on ?? "").localeCompare(b.follow_up_on ?? ""));
  return (
    <WidgetCard widgetKey="widget.coach.coachingFollowUps" href="/coach/coaching-log">
      {open.length === 0 && <p className="text-sm text-muted-foreground">{t("noFollowUps")}</p>}
      <ul className="flex flex-col gap-1 text-sm">
        {open.slice(0, 8).map((l) => (
          <li key={l.id} className="flex justify-between gap-2">
            <span>{l.teacher?.full_name}</span>
            <span className="text-muted-foreground">
              {formatDate(l.follow_up_on ?? "", locale)}
            </span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

/** Coach home: growth in supported teachers' classes vs. the whole school. */
export async function CoachGrowthWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Insights");
  const school = actor.effective.school_id;
  if (!school) return null;
  const [classes, avg] = await Promise.all([classStats(school), schoolAverages(school)]);
  const g = growthVsAverage(
    classes.map((c) => (c.avg_growth === null ? null : Number(c.avg_growth))),
    [avg?.avg_growth === null || avg?.avg_growth === undefined ? null : Number(avg.avg_growth)],
  );
  const rows = [
    { label: t("myClasses"), value: g.group },
    { label: t("school"), value: g.school },
  ];
  return (
    <WidgetCard widgetKey="widget.coach.growthVsSchool">
      <ChartFrame
        id="growth"
        title={t("growthTitle")}
        summary={t("growthSummary")}
        table={{ headers: [t("group"), t("growth")], rows: rows.map((r) => [r.label, r.value]) }}
      >
        <BarChart
          max={2}
          rows={rows.map((r) => ({
            label: r.label,
            value: Math.max(0, r.value ?? 0),
            display: r.value === null ? "—" : String(r.value),
          }))}
        />
      </ChartFrame>
    </WidgetCard>
  );
}
