import { getTranslations } from "next-intl/server";
import { ProgressRing } from "@/components/progress-ring";
import { budgetStats } from "@/features/insights/queries";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { WidgetProps } from ".";
import { WidgetCard } from "./widget-card";

/** Free-tier limits (SPEC §12): DB 500 MB (warn at 400), email 100/day (stop at 90). */
export const LIMITS = {
  dbBytes: 500 * 1024 * 1024,
  dbWarn: 400 * 1024 * 1024,
  emails: 100,
  emailStop: 90,
};

/** Owner home: database size, emails sent today, Drive calls today. */
export async function OwnerBudgetWidget(_: WidgetProps) {
  const t = await getTranslations("Insights");
  const b = await budgetStats();
  if (!b) return null;
  const mb = (n: number) => `${Math.round(n / 1024 / 1024)} MB`;
  const emailWarn = Math.min(LIMITS.emailStop, serverEnv().EMAIL_DAILY_BUDGET);
  return (
    <WidgetCard widgetKey="widget.owner.budgetMeters">
      <div className="flex flex-wrap justify-around gap-4">
        <ProgressRing
          value={(Number(b.db_bytes) / LIMITS.dbBytes) * 100}
          display={mb(Number(b.db_bytes))}
          tone={Number(b.db_bytes) >= LIMITS.dbWarn ? "rose" : "blue"}
          label={`${t("dbSize")} / 500 MB`}
          size={112}
        />
        <ProgressRing
          value={(b.emails_today / LIMITS.emails) * 100}
          display={String(b.emails_today)}
          tone={b.emails_today >= emailWarn ? "rose" : "green"}
          label={`${t("emailsToday")} / ${LIMITS.emails}`}
          size={112}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {t("driveCalls", { n: b.drive_calls_today })} ·{" "}
        {t("people", { students: b.students, staff: b.staff })}
      </p>
    </WidgetCard>
  );
}

/** Owner home: content health — items per department, calibration, lessons without practice, missing media. */
export async function OwnerContentHealthWidget(_: WidgetProps) {
  const t = await getTranslations("Insights");
  const db = await createClient();
  const [items, calibrated, lessons, missing] = await Promise.all([
    db.from("items").select("id", { count: "exact", head: true }).eq("status", "active"),
    db
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .not("b_calibrated", "is", null),
    db.from("lessons").select("id, lesson_items(count)").eq("status", "active"),
    db.from("media_assets").select("id", { count: "exact", head: true }).eq("status", "missing"),
  ]);
  const noPractice = (lessons.data ?? []).filter(
    (l) => (l.lesson_items[0]?.count ?? 0) === 0,
  ).length;
  const rows = [
    { label: t("activeItems"), value: items.count ?? 0 },
    { label: t("calibratedItems"), value: calibrated.count ?? 0 },
    { label: t("lessonsNoPractice"), value: noPractice, warn: noPractice > 0 },
    { label: t("missingMedia"), value: missing.count ?? 0, warn: (missing.count ?? 0) > 0 },
  ];
  return (
    <WidgetCard widgetKey="widget.owner.contentHealth" href="/owner/content">
      <dl className="grid grid-cols-2 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg bg-muted p-3">
            <dt className="text-xs text-muted-foreground">{r.label}</dt>
            <dd
              className={`text-2xl font-semibold tabular-nums ${r.warn ? "text-destructive" : ""}`}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">{t("calibrationNote")}</p>
    </WidgetCard>
  );
}
