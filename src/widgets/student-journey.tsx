import { ArrowRight, Coins, Flame, Star } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { learnerLevels } from "@/features/learning/profile/queries";
import { rewardsSummary } from "@/features/rewards/queries";
import { Link } from "@/i18n/navigation";
import { localName } from "@/lib/i18n-names";
import { createClient } from "@/lib/supabase/server";
import { appTimeZone } from "@/lib/time";
import type { WidgetProps } from ".";
import "./student-journey.css";

/** Morning, afternoon or evening in school time. */
function partOfDay(): "morning" | "afternoon" | "evening" {
  const hour = Number(
    new Intl.DateTimeFormat("en", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: appTimeZone(),
    }).format(new Date()),
  );
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

/**
 * Student home, first thing they see: a greeting, level and streak at a glance, the one next
 * step, and the path of levels with "you are here". Levels come from the department's cut
 * scores (content, not code).
 */
export async function StudentJourneyWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Journey");
  const locale = await getLocale();
  const id = actor.effective.id;
  const [summary, levels] = await Promise.all([rewardsSummary(id), learnerLevels(id)]);
  const placed = levels.overall[0];
  const db = await createClient();
  const { data: steps } = placed
    ? await db
        .from("cut_scores")
        .select("cefr, min_theta")
        .eq("department_id", placed.department_id)
        .order("min_theta")
    : { data: [] };
  const { current, next, progress } = summary.level;
  const first = actor.effective.full_name.split(/\s+/)[0] ?? "";
  const next_ = placed
    ? { href: "/student/lessons", title: t("continue"), hint: t("continueHint") }
    : { href: "/student/placement", title: t("findLevel"), hint: t("findLevelHint") };

  return (
    <section
      data-widget="widget.student.journey"
      className="journey flex min-w-0 flex-col gap-5 rounded-3xl p-5 text-white md:col-span-2 md:p-6 xl:col-span-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold md:text-3xl">{t(partOfDay(), { name: first })}</h2>
          <ul className="flex flex-wrap gap-2 text-sm font-semibold">
            <li className="journey-chip">
              <Star aria-hidden className="size-4" />
              {current ? localName(current, locale) : t("level", { n: 1 })} ·{" "}
              {t("xp", { xp: summary.xp })}
            </li>
            <li className="journey-chip">
              <Flame aria-hidden className="size-4" />
              {t("streak", { days: summary.streak.days })}
            </li>
            <li className="journey-chip">
              <Coins aria-hidden className="size-4" />
              {t("coins", { n: summary.coins })}
            </li>
          </ul>
        </div>
        <Link href={next_.href} className="journey-next">
          <span className="flex flex-col text-start">
            <span className="text-lg font-bold">{next_.title}</span>
            <span className="text-sm opacity-90">{next_.hint}</span>
          </span>
          <ArrowRight aria-hidden className="size-6 shrink-0 rtl:rotate-180" />
        </Link>
      </div>

      <div className="flex flex-col gap-1.5">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label={
            next
              ? t("toNext", { left: next.xp_required - summary.xp, name: localName(next, locale) })
              : t("top")
          }
          className="h-3 overflow-hidden rounded-full bg-white/20"
        >
          <div
            className="journey-bar h-full rounded-full"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="text-sm text-white/90">
          {next
            ? t("toNext", { left: next.xp_required - summary.xp, name: localName(next, locale) })
            : t("top")}
        </p>
      </div>

      {placed && (steps?.length ?? 0) > 1 && (
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="font-bold">{t("path")}</h3>
          {/* Levels always read low → high, left to right, in both languages. */}
          <ol dir="ltr" className="flex items-end gap-1 overflow-x-auto pt-7 pb-1">
            {(steps ?? []).map((s, i) => {
              const here = s.cefr === placed.cefr;
              return (
                <li
                  key={s.cefr}
                  aria-current={here ? "step" : undefined}
                  className="journey-step"
                  style={{ height: `${2.5 + i * 0.55}rem` }}
                >
                  <span className="font-bold">{s.cefr}</span>
                  {here && <span className="journey-here">{t("here")}</span>}
                </li>
              );
            })}
          </ol>
          <p className="text-sm text-white/90">
            {t("pathHelp", {
              department: placed.departments ? localName(placed.departments, locale) : "",
            })}
          </p>
        </div>
      )}
    </section>
  );
}
