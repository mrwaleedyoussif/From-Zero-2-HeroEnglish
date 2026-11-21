import { getTranslations, setRequestLocale } from "next-intl/server";
import { FormRow, SelectField, TextField } from "@/components/field";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CEFR, GRADE_BANDS } from "@/features/content/import/fields";
import { LessonCard } from "@/features/content/library/lesson-card";
import { FORMATS, libraryFilters, searchLessons } from "@/features/content/library/queries";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { localName } from "@/lib/i18n-names";

/** Lesson library for staff (SPEC Phase 3): filter by department, skill, CEFR, grade band, tag, format. */
export default async function LibraryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/teacher/library">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "content:view", "page.teacher.library");
  const t = await getTranslations("Library");
  const filters = libraryFilters.parse(await searchParams);
  const { lessons, departments } = await searchLessons(actor, filters);
  const skills = departments
    .filter((d) => !filters.department || d.code === filters.department)
    .flatMap((d) =>
      d.skills.map((s) => ({ value: s.id, label: `${d.code} · ${localName(s, locale)}` })),
    );
  const any = t("any");

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      <form method="get" className="contents">
        <FormRow>
          <SelectField
            idPrefix="lib"
            label={t("department")}
            name="department"
            defaultValue={filters.department ?? ""}
            placeholder={any}
            options={departments.map((d) => ({ value: d.code, label: localName(d, locale) }))}
          />
          <SelectField
            idPrefix="lib"
            label={t("skill")}
            name="skill"
            defaultValue={filters.skill ?? ""}
            placeholder={any}
            options={skills}
          />
          <SelectField
            idPrefix="lib"
            label="CEFR"
            name="cefr"
            defaultValue={filters.cefr ?? ""}
            placeholder={any}
            options={CEFR.map((c) => ({ value: c, label: c }))}
          />
          <SelectField
            idPrefix="lib"
            label={t("gradeBand")}
            name="grade"
            defaultValue={filters.grade ?? ""}
            placeholder={any}
            options={GRADE_BANDS.map((g) => ({ value: g, label: g }))}
          />
          <SelectField
            idPrefix="lib"
            label={t("format")}
            name="format"
            defaultValue={filters.format ?? ""}
            placeholder={any}
            options={FORMATS.map((f) => ({ value: f, label: t(`formats.${f}`) }))}
          />
          <TextField
            idPrefix="lib"
            label={t("tag")}
            name="tag"
            defaultValue={filters.tag}
            className="w-32"
          />
          <TextField
            idPrefix="lib"
            label={t("search")}
            name="q"
            type="search"
            defaultValue={filters.q}
          />
          <Button type="submit" variant="secondary">
            {t("filter")}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/teacher/library">{t("clear")}</Link>
          </Button>
        </FormRow>
      </form>
      <p className="text-sm text-muted-foreground" role="status">
        {t("count", { count: lessons.length })}
      </p>
      {lessons.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lessons.map((l) => (
            <LessonCard key={l.id} lesson={l} />
          ))}
        </div>
      )}
    </>
  );
}
