import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { runTickNow } from "@/features/reports/actions";
import { ReportArchive } from "@/features/reports/components/report-archive";
import { schedulerStatus } from "@/features/reports/queries";
import { requirePermission } from "@/lib/auth/guard";
import { serverEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/i18n-names";

/** Owner: scheduler health (queue, emails vs. budget, recent ticks) and every report (SPEC §12). */
export default async function OwnerReportsPage({ params }: PageProps<"/[locale]/owner/reports">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "integrations:manage", "page.owner.reports");
  const t = await getTranslations("Reports");
  const lang = await getLocale();
  const s = await schedulerStatus();
  const budget = serverEnv().EMAIL_DAILY_BUDGET;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} description={t("ownerIntro")} />
      <section className="flex flex-col gap-3" data-section="scheduler">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("scheduler")}</h2>
          {!actor.viewAs && (
            <ActionForm action={runTickNow} successMessage="saved">
              <Button type="submit" size="sm" variant="outline">
                {t("runNow")}
              </Button>
            </ActionForm>
          )}
        </div>
        <p data-emails-today={s.emailsToday}>
          {t("emailsToday", { n: s.emailsToday, budget })} · {t("deferredCount", { n: s.deferred })}
        </p>
        <table className="text-sm">
          <thead>
            <tr className="border-b">
              <th scope="col" className="px-2 py-1 text-start">
                {t("job")}
              </th>
              <th scope="col" className="px-2 py-1 text-start">
                {t("status")}
              </th>
              <th scope="col" className="px-2 py-1 text-start">
                #
              </th>
            </tr>
          </thead>
          <tbody>
            {s.queue.map((q) => (
              <tr
                key={`${q.kind}-${q.status}`}
                className="border-b last:border-0"
                data-job={`${q.kind}:${q.status}`}
              >
                <td className="px-2 py-1">{t(`kind.${q.kind as "report"}`)}</td>
                <td className="px-2 py-1">{t(`jobStatus.${q.status as "done"}`)}</td>
                <td className="px-2 py-1 tabular-nums">{q.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {s.errors.length > 0 && (
          <ul className="text-sm text-destructive">
            {s.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <h3 className="font-medium">{t("recentTicks")}</h3>
        <ul className="text-sm text-muted-foreground">
          {s.runs.map((r) => (
            <li key={r.started_at}>
              {formatDateTime(r.started_at, lang)} · {r.source} ·{" "}
              {t("tickSummary", {
                planned: r.planned,
                processed: r.processed,
                failed: r.failed,
                deferred: r.deferred,
              })}
            </li>
          ))}
        </ul>
      </section>
      <ReportArchive actor={actor} />
    </div>
  );
}
