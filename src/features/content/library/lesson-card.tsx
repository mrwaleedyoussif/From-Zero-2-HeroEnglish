import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { localName } from "@/lib/i18n-names";
import type { LibraryLesson } from "./queries";

const CEFR_CLASS: Record<string, string> = {
  PreA1: "bg-cefr-pre-a1 text-cefr-light-fg",
  A1: "bg-cefr-a1 text-cefr-light-fg",
  A2: "bg-cefr-a2 text-cefr-light-fg",
  B1: "bg-cefr-b1 text-cefr-light-fg",
  B2: "bg-cefr-b2 text-cefr-dark-fg",
  C1: "bg-cefr-c1 text-cefr-dark-fg",
  C2: "bg-cefr-c2 text-cefr-dark-fg",
};

/** One lesson in the library. Opening uses the media proxy, or the external link (YouTube etc.). */
export async function LessonCard({ lesson }: { lesson: LibraryLesson }) {
  const t = await getTranslations("Library");
  const locale = await getLocale();
  const title = locale === "ar" ? lesson.title_ar : lesson.title_en;
  const href = lesson.media_asset_id ? `/api/media/${lesson.media_asset_id}` : lesson.content_url;
  const practice = lesson.lesson_items[0]?.count ?? 0;

  return (
    <Card data-lesson={lesson.code} className="flex flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          {lesson.cefr && (
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold ${CEFR_CLASS[lesson.cefr] ?? ""}`}
            >
              {lesson.cefr}
            </span>
          )}
          <Badge variant="secondary">{t(`formats.${lesson.format}`)}</Badge>
          {lesson.grade_band && (
            <Badge variant="outline">{t("grades", { band: lesson.grade_band })}</Badge>
          )}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {lesson.departments ? localName(lesson.departments, locale) : ""}
          {lesson.skills ? ` · ${localName(lesson.skills, locale)}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        {lesson.objectives && <p className="text-muted-foreground">{lesson.objectives}</p>}
        <div className="flex flex-wrap gap-1">
          {lesson.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="font-normal">
              <bdi dir="ltr">#{tag}</bdi>
            </Badge>
          ))}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {lesson.duration_min ? t("minutes", { n: lesson.duration_min }) : ""}
            {practice ? ` · ${t("practice", { n: practice })}` : ""}
          </span>
          <code dir="ltr">{lesson.code}</code>
        </div>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("open")}
          </a>
        )}
      </CardContent>
    </Card>
  );
}
