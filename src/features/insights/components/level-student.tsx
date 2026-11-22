import { getLocale, getTranslations } from "next-intl/server";
import { formatDate, localName } from "@/lib/i18n-names";
import { createClient } from "@/lib/supabase/server";
import { ChartFrame } from "./chart-frame";
import { BarChart } from "./charts";

/** Student level: overall level history and recent lessons (RLS limits what each viewer reads). */
export async function LevelStudent({ studentId }: { studentId: string }) {
  const t = await getTranslations("Insights");
  const locale = await getLocale();
  const db = await createClient();
  const [{ data: history }, { data: lessons }] = await Promise.all([
    db
      .from("ability_estimates")
      .select("theta, cefr, source, measured_at, departments(name_en, name_ar)")
      .eq("student_id", studentId)
      .is("skill_id", null)
      .order("measured_at")
      .limit(50),
    db
      .from("lesson_progress")
      .select(
        "status, best_score, time_spent_sec, last_opened_at, lessons(code, title_en, title_ar)",
      )
      .eq("student_id", studentId)
      .order("last_opened_at", { ascending: false })
      .limit(20),
  ]);
  const points = (history ?? []).map((h) => ({
    label: `${formatDate(h.measured_at, locale)} · ${t(`source.${h.source}`)}`,
    theta: Number(h.theta),
    cefr: h.cefr,
    dept: h.departments ? localName(h.departments, locale) : "",
  }));

  return (
    <div className="flex flex-col gap-8">
      {points.length === 0 ? (
        <p className="text-muted-foreground">{t("noHistory")}</p>
      ) : (
        <ChartFrame
          id="history"
          title={t("historyTitle")}
          summary={t("historySummary")}
          table={{
            headers: [t("date"), t("department"), t("level"), "θ"],
            rows: points.map((p) => [p.label, p.dept, p.cefr, p.theta.toFixed(2)]),
          }}
        >
          {/* θ (−4…4) drawn from 0 so every bar is visible; the label is the CEFR level. */}
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
      <section className="flex flex-col gap-2">
        <h3 className="font-medium">{t("recentLessons")}</h3>
        {(lessons ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noLessons")}</p>
        )}
        <ul className="flex flex-col gap-1 text-sm">
          {(lessons ?? []).map((l, i) => (
            <li
              key={i}
              className="flex flex-wrap justify-between gap-2 border-b py-1 last:border-0"
            >
              <span>
                {l.lessons ? (locale === "ar" ? l.lessons.title_ar : l.lessons.title_en) : ""}
              </span>
              <span className="text-muted-foreground">
                {t(`lessonStatus.${l.status}`)}
                {l.best_score === null ? "" : ` · ${l.best_score}%`} ·{" "}
                {formatDate(l.last_opened_at, locale)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
