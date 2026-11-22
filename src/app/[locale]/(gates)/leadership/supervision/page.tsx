import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { coachingLogs } from "@/features/coaching/queries";
import { ExportLink } from "@/features/insights/components/export-link";
import { SupervisionTree } from "@/features/insights/components/supervision-tree";
import { requirePermission } from "@/lib/auth/guard";
import { formatDate } from "@/lib/i18n-names";

/** Supervision (SPEC §11, principal): who supervises whom, last activity, coaching activity. */
export default async function SupervisionPage({
  params,
}: PageProps<"/[locale]/leadership/supervision">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "supervision:view", "page.leadership.supervision");
  const t = await getTranslations("Insights");
  const school = actor.effective.school_id;
  const logs = (await coachingLogs(30)).slice(0, 30);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("supervisionTitle")} description={t("supervisionIntro")} />
      {school ? (
        <SupervisionTree schoolId={school} />
      ) : (
        <p className="text-muted-foreground">{t("nothingInScope")}</p>
      )}
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("coachingActivity")}</h2>
          <ExportLink dataset="coaching" params={{}} />
        </div>
        {logs.length === 0 && <p className="text-sm text-muted-foreground">{t("noCoaching")}</p>}
        <ul className="flex flex-col gap-1 text-sm">
          {logs.map((l) => (
            <li key={l.id}>
              {formatDate(l.observed_on, locale)} · {l.coach?.full_name} → {l.teacher?.full_name} ·{" "}
              {t(`coachingKind.${l.kind}`)}
              {l.follow_up_on && l.status === "open"
                ? ` · ${t("followUp", { date: formatDate(l.follow_up_on, locale) })}`
                : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
