import { getLocale, getTranslations } from "next-intl/server";
import { listReports } from "@/features/reports/queries";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/i18n-names";
import type { WidgetProps } from ".";
import { WidgetCard } from "./widget-card";

/** Leadership home: the latest reports (own and, for school-level viewers, the school's). */
export async function LeadershipReportArchiveWidget(_: WidgetProps) {
  const t = await getTranslations("Reports");
  const locale = await getLocale();
  const reports = await listReports(6);
  return (
    <WidgetCard widgetKey="widget.leadership.reportArchive" href="/leadership/reports">
      {reports.length === 0 && <p className="text-sm text-muted-foreground">{t("noReports")}</p>}
      <ul className="flex flex-col gap-1 text-sm">
        {reports.map((r) => (
          <li key={r.id} className="flex flex-wrap justify-between gap-2">
            <Link href={`/reports/${r.id}`} className="text-primary hover:underline">
              {t(`period.${r.period as "weekly" | "monthly"}`)} ·{" "}
              {formatDate(r.period_start, locale)}
            </Link>
            <span className="text-muted-foreground">{r.profiles?.full_name}</span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
