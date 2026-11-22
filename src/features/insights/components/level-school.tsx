import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localName } from "@/lib/i18n-names";
import { cefrDistribution } from "../analytics";
import type { ClassStat } from "../queries";
import { classCefr } from "../queries";
import { ChartFrame } from "./chart-frame";
import { BarChart, CefrStack } from "./charts";

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** Group class rows by grade (or keep classes when `byClass`). */
export function rollUp(rows: ClassStat[], byClass: boolean) {
  const groups = new Map<string, { id: string; label: ClassStat; members: ClassStat[] }>();
  for (const r of rows) {
    const id = byClass ? r.class_id : r.grade_id;
    const g = groups.get(id) ?? { id, label: r, members: [] };
    g.members.push(r);
    groups.set(id, g);
  }
  return [...groups.values()].map((g) => {
    const sum = (k: "students" | "active_7d" | "lessons_7d" | "at_risk" | "overdue") =>
      g.members.reduce((s, m) => s + Number(m[k] ?? 0), 0);
    const acc = g.members.filter((m) => m.accuracy_7d !== null);
    return {
      id: g.id,
      first: g.label,
      classIds: g.members.map((m) => m.class_id),
      students: sum("students"),
      active: sum("active_7d"),
      lessons: sum("lessons_7d"),
      atRisk: sum("at_risk"),
      overdue: sum("overdue"),
      accuracy: acc.length
        ? Math.round(acc.reduce((s, m) => s + Number(m.accuracy_7d), 0) / acc.length)
        : null,
    };
  });
}

/** School or grade level: engagement and CEFR placement per grade (or per class in a grade). */
export async function LevelGroups({
  rows,
  byClass,
  href,
}: {
  rows: ClassStat[];
  byClass: boolean;
  href: (id: string) => string;
}) {
  const t = await getTranslations("Insights");
  const locale = await getLocale();
  const groups = rollUp(rows, byClass);
  const name = (g: (typeof groups)[number]) =>
    byClass
      ? g.first.class_code
      : localName({ name_en: g.first.grade_name_en, name_ar: g.first.grade_name_ar }, locale);
  const cefr = await classCefr(rows[0]?.school_id ?? null);
  const stack = groups.map((g) => ({
    label: name(g),
    counts: cefrDistribution(cefr.filter((c) => g.classIds.includes(c.class_id))),
  }));
  const head = [
    byClass ? t("class") : t("grade"),
    t("students"),
    t("activePct"),
    t("lessons7d"),
    t("accuracy"),
    t("atRisk"),
  ];

  return (
    <div className="flex flex-col gap-8">
      <ChartFrame
        id="engagement"
        title={t("engagementTitle")}
        summary={t("engagementSummary")}
        table={{
          headers: head,
          rows: groups.map((g) => [
            name(g),
            g.students,
            `${pct(g.active, g.students)}%`,
            g.lessons,
            g.accuracy === null ? null : `${g.accuracy}%`,
            g.atRisk,
          ]),
        }}
      >
        <BarChart
          max={100}
          rows={groups.map((g) => ({
            label: name(g),
            value: pct(g.active, g.students),
            display: `${pct(g.active, g.students)}%`,
          }))}
        />
      </ChartFrame>
      <ChartFrame
        id="cefr"
        title={t("cefrTitle")}
        summary={t("cefrSummary")}
        table={{
          headers: [byClass ? t("class") : t("grade"), t("level"), t("students")],
          rows: stack.flatMap((s) =>
            s.counts.map((c) => [s.label, c.cefr === "none" ? t("notPlaced") : c.cefr, c.n]),
          ),
        }}
      >
        <CefrStack rows={stack} noneLabel={t("notPlaced")} />
      </ChartFrame>
      <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {groups.map((g) => (
          <li key={g.id}>
            <Link
              href={href(g.id)}
              className="flex justify-between gap-2 rounded-lg border p-3 hover:border-primary"
              data-drill={name(g)}
            >
              <span className="font-medium">{name(g)}</span>
              <span className="text-sm text-muted-foreground">
                {t("studentsAtRisk", { n: g.students, risk: g.atRisk })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
