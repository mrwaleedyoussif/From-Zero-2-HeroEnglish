import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { ReportArchive } from "@/features/reports/components/report-archive";
import { requirePermission } from "@/lib/auth/guard";

/** Report archive and preferences for the coach gate (SPEC §12). */
export default async function CoachReportsPage({ params }: PageProps<"/[locale]/coach/reports">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "reports:view", "page.coach.reports");
  const t = await getTranslations("Reports");
  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      <ReportArchive actor={actor} />
    </>
  );
}
