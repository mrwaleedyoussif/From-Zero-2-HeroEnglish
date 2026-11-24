import { AlertTriangle, BookOpenCheck, Clock, Target, TrendingUp, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { ProgressRing } from "@/components/progress-ring";
import { classStats } from "@/features/insights/queries";
import type { WidgetProps } from ".";

/**
 * Staff home, first thing: the few numbers that say how the week is going, across every class
 * the person may see (their own classes for a teacher, the school for a leader). The database
 * function decides the scope.
 */
async function Headline({ actor, widgetKey }: WidgetProps & { widgetKey: string }) {
  const t = await getTranslations("Headline");
  const classes = await classStats(actor.effective.school_id);
  const sum = (pick: (c: (typeof classes)[number]) => number | null) =>
    classes.reduce((n, c) => n + (pick(c) ?? 0), 0);
  const students = sum((c) => c.students);
  const active = sum((c) => c.active_7d);
  const scored = classes.filter((c) => c.accuracy_7d !== null);
  const accuracy = scored.length
    ? Math.round(scored.reduce((n, c) => n + Number(c.accuracy_7d), 0) / scored.length)
    : null;
  const activePct = students ? Math.round((active / students) * 100) : null;
  const tiles: {
    key: string;
    icon: ReactNode;
    value: string;
    tone: string;
    ring?: number | null;
  }[] = [
    { key: "students", icon: <Users aria-hidden />, value: String(students), tone: "#1d4ed8" },
    {
      key: "active",
      icon: <TrendingUp aria-hidden />,
      value: activePct === null ? "—" : `${activePct}%`,
      tone: "#047857",
      ring: activePct,
    },
    {
      key: "lessons",
      icon: <BookOpenCheck aria-hidden />,
      value: String(sum((c) => c.lessons_7d)),
      tone: "#6d28d9",
    },
    {
      key: "accuracy",
      icon: <Target aria-hidden />,
      value: accuracy === null ? "—" : `${accuracy}%`,
      tone: "#0e7490",
      ring: accuracy,
    },
    {
      key: "atRisk",
      icon: <AlertTriangle aria-hidden />,
      value: String(sum((c) => c.at_risk)),
      tone: "#b45309",
    },
    {
      key: "overdue",
      icon: <Clock aria-hidden />,
      value: String(sum((c) => c.overdue)),
      tone: "#be123c",
    },
  ];
  return (
    <section
      data-widget={widgetKey}
      aria-label={t("label")}
      className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:col-span-2 xl:col-span-3 xl:grid-cols-6"
    >
      {tiles.map((tile) => (
        <div
          key={tile.key}
          data-tile={tile.key}
          className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card p-4 text-center"
          style={{ borderTop: `4px solid ${tile.tone}` }}
        >
          {tile.ring !== undefined ? (
            <ProgressRing value={tile.ring} label={t(tile.key)} size={104} />
          ) : (
            <>
              <span className="[&_svg]:size-5" style={{ color: tile.tone }}>
                {tile.icon}
              </span>
              <span className="text-3xl font-extrabold tabular-nums">{tile.value}</span>
              <span className="text-sm text-muted-foreground">{t(tile.key)}</span>
            </>
          )}
        </div>
      ))}
    </section>
  );
}

export const TeacherHeadlineWidget = (p: WidgetProps) => (
  <Headline {...p} widgetKey="widget.teacher.headline" />
);
export const LeadershipHeadlineWidget = (p: WidgetProps) => (
  <Headline {...p} widgetKey="widget.leadership.headline" />
);
