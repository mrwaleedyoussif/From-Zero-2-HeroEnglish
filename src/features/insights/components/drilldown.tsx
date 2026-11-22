import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import { can } from "@/lib/auth/can";
import type { Actor } from "@/lib/auth/session";
import { localName } from "@/lib/i18n-names";
import { createClient } from "@/lib/supabase/server";
import { classStats } from "../queries";
import { ExportLink } from "./export-link";
import { LevelClass } from "./level-class";
import { LevelGroups } from "./level-school";
import { LevelStudent } from "./level-student";

export const drillParams = z.object({
  school: z.guid().optional().catch(undefined),
  grade: z.guid().optional().catch(undefined),
  class: z.guid().optional().catch(undefined),
  student: z.guid().optional().catch(undefined),
});
export type DrillParams = z.infer<typeof drillParams>;

/**
 * Drill-down (SPEC §11): school → grade → class → student. Every level only shows what the DB
 * functions return for this viewer, so the same view serves Owner, leadership, coach and teacher.
 */
export async function Drilldown({
  actor,
  basePath,
  p,
}: {
  actor: Actor;
  basePath: string;
  p: DrillParams;
}) {
  const t = await getTranslations("Insights");
  const locale = await getLocale();
  const school = p.school ?? actor.effective.school_id ?? null;
  const rows = await classStats(school);
  const q = (extra: Partial<DrillParams>) => {
    const all = { school: p.school, ...extra };
    const s = new URLSearchParams(Object.entries(all).filter((e): e is [string, string] => !!e[1]));
    return `${basePath}?${s.toString()}`;
  };
  const cls = p.class ? rows.find((r) => r.class_id === p.class) : undefined;
  const grade = rows.find((r) => r.grade_id === (p.grade ?? cls?.grade_id));
  if ((p.class && !cls) || (p.grade && !grade)) notFound();

  let student: { id: string; name: string } | null = null;
  if (p.student) {
    if (!(await can(actor, "students:view", { userId: p.student }))) notFound();
    const { data } = await (
      await createClient()
    )
      .from("profiles")
      .select("full_name")
      .eq("id", p.student)
      .maybeSingle();
    if (!data) notFound();
    student = { id: p.student, name: data.full_name };
  }

  const crumbs = [
    { label: t("allClasses"), href: q({}) },
    grade && {
      label: localName({ name_en: grade.grade_name_en, name_ar: grade.grade_name_ar }, locale),
      href: q({ grade: grade.grade_id }),
    },
    cls && { label: cls.class_code, href: q({ grade: cls.grade_id, class: cls.class_id }) },
    student && { label: student.name, href: "" },
  ].filter((c): c is { label: string; href: string } => !!c);

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label={t("breadcrumbs")}
        className="flex flex-wrap items-center gap-2 text-sm print:hidden"
      >
        {crumbs.map((c, i) => (
          <span key={c.label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>›</span>}
            {c.href && i < crumbs.length - 1 ? (
              <Link href={c.href} className="text-primary hover:underline">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium">
                {c.label}
              </span>
            )}
          </span>
        ))}
        <span className="ms-auto">
          <ExportLink
            dataset={cls ? "students" : "classes"}
            params={{ school: school ?? "", class: cls?.class_id ?? "" }}
          />
        </span>
      </nav>
      {rows.length === 0 && <p className="text-muted-foreground">{t("nothingInScope")}</p>}
      {student ? (
        <LevelStudent studentId={student.id} />
      ) : cls ? (
        <LevelClass
          classId={cls.class_id}
          href={(id) => q({ grade: cls.grade_id, class: cls.class_id, student: id })}
        />
      ) : grade ? (
        <LevelGroups
          rows={rows.filter((r) => r.grade_id === grade.grade_id)}
          byClass
          href={(id) => q({ grade: grade.grade_id, class: id })}
        />
      ) : rows.length > 0 ? (
        <LevelGroups rows={rows} byClass={false} href={(id) => q({ grade: id })} />
      ) : null}
    </div>
  );
}
