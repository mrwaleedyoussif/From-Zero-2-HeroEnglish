import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StartButton } from "@/features/placement/components/start-button";
import { type DepartmentStatus, studentOverview } from "@/features/placement/queries";
import type { StartDecision } from "@/features/placement/runtime/rules";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { formatDate, localName } from "@/lib/i18n-names";

/** Student placement home: one card per department — start, resume, result, or why not yet. */
export default async function StudentPlacementPage({
  params,
}: PageProps<"/[locale]/student/placement">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "placement:take", "page.student.placement");
  const t = await getTranslations("Placement");
  const departments = await studentOverview(actor);

  const action = (
    d: DepartmentStatus,
    kind: "placement" | "progress",
    decision: StartDecision | null,
  ) => {
    if (!decision) return null;
    if (decision.ok) {
      const label = decision.resume
        ? t("resume")
        : kind === "progress"
          ? t("startProgress")
          : d.last
            ? t("retake")
            : t("start");
      return actor.viewAs ? null : <StartButton department={d.code} kind={kind} label={label} />;
    }
    if (kind === "progress") return null;
    if (decision.reason === "cooldown")
      return (
        <p className="text-sm text-muted-foreground">
          {t("cooldown", { date: formatDate(decision.until, locale) })}
        </p>
      );
    return <p className="text-sm text-muted-foreground">{t("askTeacher")}</p>;
  };

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      {departments.length === 0 && <p className="text-muted-foreground">{t("none")}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {departments.map((d) => (
          <Card key={d.code} data-department={d.code}>
            <CardHeader>
              <CardTitle>{localName(d, locale)}</CardTitle>
              <CardDescription>
                {d.last
                  ? t("lastResult", {
                      cefr: d.last.cefr ?? "—",
                      date: formatDate(d.last.completedAt, locale),
                    })
                  : t("notTaken")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-3">
              {d.last && (
                <Button asChild variant="outline">
                  <Link href={`/student/placement/${d.last.id}/result`}>{t("seeResult")}</Link>
                </Button>
              )}
              {action(d, "placement", d.placement)}
              {d.progress?.ok && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{t("progressOpen")}</p>
                  {action(d, "progress", d.progress)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
