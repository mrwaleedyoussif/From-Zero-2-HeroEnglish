import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Actor } from "@/lib/auth/session";
import { formatDate } from "@/lib/i18n-names";
import { savePreferences } from "../actions";
import { listReports, myPreferences } from "../queries";

/** Report archive (SPEC §12 "in-app report page") with the viewer's email/report preferences. */
export async function ReportArchive({ actor }: { actor: Actor }) {
  const t = await getTranslations("Reports");
  const locale = await getLocale();
  const [reports, prefs] = await Promise.all([listReports(), myPreferences(actor.real.id)]);
  const me = actor.effective.id;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2" data-section="archive">
        <h2 className="text-lg font-semibold">{t("archive")}</h2>
        {reports.length === 0 && <p className="text-muted-foreground">{t("noReports")}</p>}
        <ul className="flex flex-col gap-1">
          {reports.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
              data-report-row={r.period}
            >
              <Link href={`/reports/${r.id}`} className="text-primary hover:underline">
                {t("rowTitle", {
                  period: t(`period.${r.period as "weekly" | "monthly"}`),
                  start: formatDate(r.period_start, locale),
                  end: formatDate(r.period_end, locale),
                })}
              </Link>
              <span className="text-sm text-muted-foreground">
                {r.recipient_id === me ? t("forYou") : (r.profiles?.full_name ?? "")}
                {r.emailed_at ? ` · ${t("emailed")}` : ""}
                {r.drive_file_id ? ` · ${t("inDrive")}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>
      {!actor.viewAs && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t("preferences")}</h2>
          <ActionForm
            action={savePreferences}
            resetOnSuccess={false}
            className="flex flex-col gap-2"
          >
            {(["weekly", "monthly", "email"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={k} defaultChecked={prefs[k]} className="size-4" />
                {t(`pref.${k}`)}
              </label>
            ))}
            <Button type="submit" size="sm" className="self-start">
              {t("save")}
            </Button>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
