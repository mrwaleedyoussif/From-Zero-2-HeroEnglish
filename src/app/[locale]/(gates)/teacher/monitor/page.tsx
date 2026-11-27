import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { myClasses } from "@/features/learning/teacher/queries";
import { MonitorTable } from "@/features/monitor/components/monitor-table";
import { StudentWork } from "@/features/monitor/components/student-work";
import { monitorClass } from "@/features/monitor/queries";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";

const pill = (on: boolean) =>
  `rounded-full border px-3 py-1 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`;

/** Monitor a class, one of its groups, or one student: presence and work in one place. */
export default async function TeacherMonitorPage({
  params,
  searchParams,
}: PageProps<"/[locale]/teacher/monitor">) {
  const { locale } = await params;
  const q = await searchParams;
  const one = (v: unknown) => (typeof v === "string" ? v : undefined);
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "students:view", "page.teacher.monitor");
  const t = await getTranslations("Monitor");
  const classes = await myClasses(actor, "students:view");
  const chosen = classes.find((c) => c.id === one(q.class)) ?? classes[0];
  const data = chosen ? await monitorClass(chosen.id, one(q.group)) : null;
  const student = data?.rows.find((r) => r.id === one(q.student));
  const base = chosen ? `/teacher/monitor?class=${chosen.id}` : "/teacher/monitor";
  const here = data?.group ? `${base}&group=${data.group.id}` : base;

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      {classes.length === 0 && <p className="text-muted-foreground">{t("noClasses")}</p>}
      <nav aria-label={t("classes")} className="flex flex-wrap gap-2">
        {classes.map((c) => (
          <Link
            key={c.id}
            href={`/teacher/monitor?class=${c.id}`}
            className={pill(c.id === chosen?.id)}
          >
            {c.code}
          </Link>
        ))}
      </nav>
      {data && data.groups.length > 0 && (
        <nav aria-label={t("groups")} className="flex flex-wrap gap-2">
          <Link href={base} className={pill(!data.group)}>
            {t("wholeClass")}
          </Link>
          {data.groups.map((g) => (
            <Link
              key={g.id}
              href={`${base}&group=${g.id}`}
              className={pill(g.id === data.group?.id)}
            >
              {g.name}
            </Link>
          ))}
        </nav>
      )}
      {data && <MonitorTable rows={data.rows} here={here} chosen={student?.id} />}
      {student && <StudentWork student={student} />}
    </>
  );
}
