import { getTranslations } from "next-intl/server";
import { budgetStats } from "@/features/insights/queries";
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

function Meter({
  label,
  value,
  max,
  warnAt,
  display,
}: {
  label: string;
  value: number;
  max: number;
  warnAt: number;
  display: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const warn = value >= warnAt;
  return (
    <div className="flex flex-col gap-1" data-meter={label} data-warn={warn ? "yes" : "no"}>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={warn ? "font-semibold text-destructive" : "text-muted-foreground"}>
          {display}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-3 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={`h-full rounded-full ${warn ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Owner home: database size, emails sent today, Drive calls today. */
export async function OwnerBudgetWidget(_: WidgetProps) {
  const t = await getTranslations("Insights");
  const b = await budgetStats();
  if (!b) return null;
  const mb = (n: number) => `${Math.round(n / 1024 / 1024)} MB`;
  return (
    <WidgetCard widgetKey="widget.owner.budgetMeters">
      <Meter
        label={t("dbSize")}
        value={Number(b.db_bytes)}
        max={LIMITS.dbBytes}
        warnAt={LIMITS.dbWarn}
        display={`${mb(Number(b.db_bytes))} / 500 MB`}
      />
      <Meter
        label={t("emailsToday")}
        value={b.emails_today}
        max={LIMITS.emails}
        warnAt={LIMITS.emailStop}
        display={`${b.emails_today} / ${LIMITS.emails}`}
      />
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
