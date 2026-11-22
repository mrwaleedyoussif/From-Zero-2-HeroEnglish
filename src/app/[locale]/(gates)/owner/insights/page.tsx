import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Drilldown, drillParams } from "@/features/insights/components/drilldown";
import { requirePermission } from "@/lib/auth/guard";

/** Insights drill-down for the owner gate (SPEC §11); scope comes from the DB functions. */
export default async function OwnerInsightsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/owner/insights">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "students:view", "page.owner.insights");
  const t = await getTranslations("Insights");
  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      <Drilldown
        actor={actor}
        basePath="/owner/insights"
        p={drillParams.parse(await searchParams)}
      />
    </>
  );
}
