import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { closeFollowUp } from "@/features/coaching/actions";
import { LogForm } from "@/features/coaching/components/log-form";
import { coachingLogs, loggableTeachers, observationRubric } from "@/features/coaching/queries";
import { ExportLink } from "@/features/insights/components/export-link";
import { requirePermission } from "@/lib/auth/guard";
import { formatDate, localName } from "@/lib/i18n-names";

/** Coaching log (SPEC §11): write observations for supported teachers, track follow-ups. */
export default async function CoachingLogPage({
  params,
}: PageProps<"/[locale]/coach/coaching-log">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "coaching:log", "page.coach.coachingLog");
  const t = await getTranslations("Coaching");
  const lang = await getLocale();
  const [logs, { teachers, classes }, rubric] = await Promise.all([
    coachingLogs(),
    loggableTeachers(actor.real.id),
    observationRubric(),
  ]);
  const criteria = new Map((rubric?.criteria ?? []).map((c) => [c.key, localName(c, lang)]));
  // "View as" a coach shows that coach's log.
  const mine = logs.filter((l) => l.coach_id === actor.effective.id);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} description={t("intro")} />
      {!actor.viewAs &&
        (teachers.length ? (
          <LogForm teachers={teachers} classes={classes} rubric={rubric} />
        ) : (
          <p className="text-muted-foreground">{t("noTeachers")}</p>
        ))}
      <section className="flex flex-col gap-3" data-section="logs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("history")}</h2>
          <ExportLink dataset="coaching" params={{}} />
        </div>
        {mine.length === 0 && <p className="text-muted-foreground">{t("none")}</p>}
        <ul className="flex flex-col gap-3">
          {mine.map((l) => (
            <li
              key={l.id}
              className="flex flex-col gap-1 rounded-lg border p-3"
              data-log={l.teacher?.full_name}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {l.teacher?.full_name} · {t(`kinds.${l.kind}`)} ·{" "}
                  {formatDate(l.observed_on, lang)}
                  {l.classes ? ` · ${l.classes.code}` : ""}
                </span>
                {l.status === "open" && l.follow_up_on && !actor.viewAs ? (
                  <ActionForm
                    action={closeFollowUp}
                    successMessage="saved"
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="id" value={l.id} />
                    <span className="text-sm">
                      {t("followUpOn", { date: formatDate(l.follow_up_on, lang) })}
                    </span>
                    <Button type="submit" size="sm" variant="outline">
                      {t("markDone")}
                    </Button>
                  </ActionForm>
                ) : (
                  <span className="text-sm text-muted-foreground">{t(`status.${l.status}`)}</span>
                )}
              </div>
              {Object.keys(l.scores as object).length > 0 && (
                <p className="text-sm">
                  {Object.entries(l.scores as Record<string, number>)
                    .map(([k, v]) => `${criteria.get(k) ?? k}: ${v}`)
                    .join(" · ")}
                </p>
              )}
              {l.notes && <p className="text-sm whitespace-pre-wrap">{l.notes}</p>}
              {l.agreed_actions && (
                <p className="text-sm whitespace-pre-wrap">
                  <span className="font-medium">{t("agreedActions")}: </span>
                  {l.agreed_actions}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
