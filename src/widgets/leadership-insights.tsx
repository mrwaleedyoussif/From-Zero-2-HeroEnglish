import { getLocale, getTranslations } from "next-intl/server";
import { cefrDistribution } from "@/features/insights/analytics";
import { ChartFrame } from "@/features/insights/components/chart-frame";
import { BarChart, CefrStack } from "@/features/insights/components/charts";
import { rollUp } from "@/features/insights/components/level-school";
import { classCefr, classStats } from "@/features/insights/queries";
import { localName } from "@/lib/i18n-names";
import type { WidgetProps } from ".";
import { WidgetCard } from "./widget-card";

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** Leadership home: the school in four numbers. */
export async function LeadershipOverviewWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Insights");
  const [all] = rollUp(await classStats(actor.effective.school_id), false).reduce(
    (acc, g) => {
      const a = acc[0];
      return [
        {
          students: a.students + g.students,
          active: a.active + g.active,
          lessons: a.lessons + g.lessons,
          atRisk: a.atRisk + g.atRisk,
        },
      ];
    },
    [{ students: 0, active: 0, lessons: 0, atRisk: 0 }],
  );
  const tiles = [
    { label: t("students"), value: all?.students ?? 0 },
    { label: t("activePct"), value: `${pct(all?.active ?? 0, all?.students ?? 0)}%` },
    { label: t("lessons7d"), value: all?.lessons ?? 0 },
    { label: t("atRisk"), value: all?.atRisk ?? 0 },
  ];
  return (
    <WidgetCard widgetKey="widget.leadership.schoolOverview" href="/leadership/insights">
      <dl className="grid grid-cols-2 gap-3">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-lg bg-muted p-3">
            <dt className="text-xs text-muted-foreground">{x.label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{x.value}</dd>
          </div>
        ))}
      </dl>
    </WidgetCard>
  );
}

/** Leadership home: active learners per grade. */
export async function LeadershipGradesWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Insights");
  const locale = await getLocale();
  const grades = rollUp(await classStats(actor.effective.school_id), false);
  const name = (g: (typeof grades)[number]) =>
    localName({ name_en: g.first.grade_name_en, name_ar: g.first.grade_name_ar }, locale);
  return (
    <WidgetCard widgetKey="widget.leadership.gradeComparison" href="/leadership/insights">
      <ChartFrame
        id="grades"
        title={t("activeByGrade")}
        summary={t("engagementSummary")}
        table={{
          headers: [t("grade"), t("students"), t("activePct"), t("accuracy")],
          rows: grades.map((g) => [
            name(g),
            g.students,
            `${pct(g.active, g.students)}%`,
            g.accuracy === null ? null : `${g.accuracy}%`,
          ]),
        }}
      >
        <BarChart
          max={100}
          rows={grades.map((g) => ({
            label: name(g),
            value: pct(g.active, g.students),
            display: `${pct(g.active, g.students)}%`,
          }))}
        />
      </ChartFrame>
    </WidgetCard>
  );
}

/** Leadership home: placement distribution by CEFR level per grade. */
export async function LeadershipPlacementWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Insights");
  const locale = await getLocale();
  const school = actor.effective.school_id;
  const [classes, cefr] = await Promise.all([classStats(school), classCefr(school)]);
  const stack = rollUp(classes, false).map((g) => ({
    label: localName({ name_en: g.first.grade_name_en, name_ar: g.first.grade_name_ar }, locale),
    counts: cefrDistribution(cefr.filter((c) => g.classIds.includes(c.class_id))),
  }));
  return (
    <WidgetCard widgetKey="widget.leadership.placementDistribution" href="/leadership/insights">
      <ChartFrame
        id="placement"
        title={t("cefrTitle")}
        summary={t("cefrSummary")}
        table={{
          headers: [t("grade"), t("level"), t("students")],
          rows: stack.flatMap((s) =>
            s.counts.map((c) => [s.label, c.cefr === "none" ? t("notPlaced") : c.cefr, c.n]),
          ),
        }}
      >
        <CefrStack rows={stack} noneLabel={t("notPlaced")} />
      </ChartFrame>
    </WidgetCard>
  );
}

/** Leadership home: lessons finished per class this week. */
export async function LeadershipEngagementWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Insights");
  const classes = await classStats(actor.effective.school_id);
  return (
    <WidgetCard widgetKey="widget.leadership.engagement" href="/leadership/insights">
      <ChartFrame
        id="class-lessons"
        title={t("lessonsByClass")}
        summary={t("lessonsSummary")}
        table={{
          headers: [t("class"), t("lessons7d"), t("xp7d")],
          rows: classes.map((c) => [c.class_code, c.lessons_7d, Number(c.xp_7d)]),
        }}
      >
        <BarChart
          tone="secondary"
          rows={classes.map((c) => ({ label: c.class_code, value: c.lessons_7d }))}
        />
      </ChartFrame>
    </WidgetCard>
  );
}
