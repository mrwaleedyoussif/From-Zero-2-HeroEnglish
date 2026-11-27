import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/i18n-names";
import { type MonitorRow, monitorStudent } from "../queries";

/** One student in detail: every unit worked on and every mock exam sat. */
export async function StudentWork({ student }: { student: MonitorRow }) {
  const t = await getTranslations("Monitor");
  const locale = await getLocale();
  const { units, mocks } = await monitorStudent(student.id);
  return (
    <section
      data-student-work={student.id}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <h2 className="flex flex-wrap items-baseline gap-3 text-lg font-bold">
        {student.name}
        <Link href={`/teacher/groups/${student.id}`} className="text-sm font-normal underline">
          {t("profile")}
        </Link>
      </h2>
      <h3 className="font-semibold">{t("unitsTitle", { count: units.length })}</h3>
      {units.length === 0 && <p className="text-muted-foreground">{t("noWork")}</p>}
      <ul className="flex flex-col gap-1 text-sm">
        {units.map((u) => (
          <li key={u.unit_id} className="flex flex-wrap gap-x-3">
            <span>{u.completed_at ? "✅" : "⏳"}</span>
            <strong dir="auto">{u.course_units?.title ?? u.unit_id}</strong>
            <span className="text-muted-foreground">
              {u.course_units?.strand} {u.course_units?.level} · {u.correct}/{u.total} ·{" "}
              {formatDate(u.updated_at, locale)}
            </span>
          </li>
        ))}
      </ul>
      <h3 className="font-semibold">{t("mocksTitle", { count: mocks.length })}</h3>
      {mocks.length === 0 && <p className="text-muted-foreground">{t("noMocks")}</p>}
      <ul className="flex flex-col gap-1 text-sm">
        {mocks.map((m) => (
          <li key={m.id} className="flex flex-wrap gap-x-3">
            <strong>{m.mock_exams?.title ?? m.exam_id}</strong>
            <span className="text-muted-foreground">
              {m.score ?? 0}/100 · {m.finished_at ? formatDate(m.finished_at, locale) : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
