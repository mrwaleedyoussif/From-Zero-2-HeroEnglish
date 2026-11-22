import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Drilldown, drillParams } from "@/features/insights/components/drilldown";
import { requirePermission } from "@/lib/auth/guard";

/** Insights drill-down for the coach gate (SPEC §11); scope comes from the DB functions. */
export default async function CoachInsightsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/coach/insights">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "supervision:view", "page.coach.insights");
  const t = await getTranslations("Insights");
  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      <Drilldown
        actor={actor}
        basePath="/coach/insights"
        p={drillParams.parse(await searchParams)}
      />
    </>
  );
}
