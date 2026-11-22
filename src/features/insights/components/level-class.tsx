import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/i18n-names";
import { type RiskFlag, riskFlags } from "../analytics";
import { skillMatrix, studentStats } from "../queries";
import { ChartFrame } from "./chart-frame";
import { BarChart, CEFR_BG } from "./charts";

/** Class level: every learner with level, growth, activity and risk flags; skill heat-map. */
export async function LevelClass({
  classId,
  href,
}: {
  classId: string;
  href: (id: string) => string;
}) {
  const t = await getTranslations("Insights");
  const locale = await getLocale();
  const [students, matrix] = await Promise.all([studentStats(classId), skillMatrix(classId)]);
  if (students.length === 0)
    return (
      <p className="text-muted-foreground" data-no-students>
        {t("aggregateOnly")}
      </p>
    );
  const now = new Date();
  const flagText = (f: RiskFlag[]) => f.map((x) => t(`risk.${x}`)).join(", ");
  const growth = (s: (typeof students)[number]) =>
    s.theta_now === null || s.theta_first === null
      ? null
      : Math.round((Number(s.theta_now) - Number(s.theta_first)) * 100) / 100;
  const skills = [...new Map(matrix.map((m) => [m.skill_id, m.skill_code])).entries()];

  return (
    <div className="flex flex-col gap-8">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-roster>
          <thead>
            <tr className="border-b text-start">
              {[
                t("student"),
                t("level"),
                t("growth"),
                t("lessons7d"),
                t("accuracy"),
                t("lastActive"),
                t("flags"),
              ].map((h) => (
                <th key={h} scope="col" className="px-2 py-1 text-start font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const flags = riskFlags(s, now);
              const g = growth(s);
              return (
                <tr
                  key={s.student_id}
                  className="border-b last:border-0"
                  data-student={s.full_name}
                >
                  <td className="px-2 py-1">
                    <Link href={href(s.student_id)} className="text-primary hover:underline">
                      {s.full_name}
                    </Link>
                  </td>
                  <td className="px-2 py-1">
                    {s.cefr_now ? (
                      <span
                        className={`rounded px-1.5 text-xs font-semibold ${CEFR_BG[s.cefr_now] ?? ""}`}
                      >
                        {s.cefr_now}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-2 py-1 tabular-nums">
                    {g === null ? "—" : `${g > 0 ? "▲" : g < 0 ? "▼" : "•"} ${g}`}
                  </td>
                  <td className="px-2 py-1 tabular-nums">{s.lessons_7d}</td>
                  <td className="px-2 py-1 tabular-nums">
                    {s.accuracy_7d === null ? "—" : `${s.accuracy_7d}%`}
                  </td>
                  <td className="px-2 py-1">
                    {s.last_active_at ? formatDate(s.last_active_at, locale) : t("never")}
                  </td>
                  <td className="px-2 py-1 text-destructive">{flagText(flags)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ChartFrame
        id="lessons"
        title={t("lessonsTitle")}
        summary={t("lessonsSummary")}
        table={{
          headers: [t("student"), t("lessons7d")],
          rows: students.map((s) => [s.full_name, s.lessons_7d]),
        }}
      >
        <BarChart
          tone="secondary"
          rows={students.map((s) => ({ label: s.full_name, value: s.lessons_7d }))}
        />
      </ChartFrame>
      {skills.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-medium">{t("heatmap")}</h3>
          <div className="overflow-x-auto">
            <table className="text-sm" data-heatmap>
              <caption className="sr-only">{t("heatmapSummary")}</caption>
              <thead>
                <tr>
                  <th scope="col" className="px-2 py-1 text-start">
                    {t("student")}
                  </th>
                  {skills.map(([id, code]) => (
                    <th key={id} scope="col" className="px-2 py-1">
                      {code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.student_id}>
                    <th scope="row" className="px-2 py-1 text-start font-normal">
                      {s.full_name}
                    </th>
                    {skills.map(([id]) => {
                      const cell = matrix.find(
                        (m) => m.student_id === s.student_id && m.skill_id === id,
                      );
                      return (
                        <td
                          key={id}
                          className={`px-2 py-1 text-center text-xs font-semibold ${cell?.cefr ? CEFR_BG[cell.cefr] : "bg-muted text-muted-foreground"}`}
                        >
                          {cell?.cefr ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
