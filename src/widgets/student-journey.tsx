import { ArrowRight, Coins, Flame, Star } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ProgressRing } from "@/components/progress-ring";
import { learnerLevels } from "@/features/learning/profile/queries";
import { rewardsSummary } from "@/features/rewards/queries";
import { Link } from "@/i18n/navigation";
import { localName } from "@/lib/i18n-names";
import { createClient } from "@/lib/supabase/server";
import { isVisible } from "@/lib/visibility/server";
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
  const [{ data: lessons }, { data: tasks }] = await Promise.all([
    db.from("lesson_progress").select("status, best_score").eq("student_id", id).limit(1000),
    db.from("assignment_progress").select("status").eq("student_id", id).limit(1000),
  ]);
  const scores = (lessons ?? []).flatMap((l) => (l.best_score === null ? [] : [l.best_score]));
  const accuracy = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const tasksDone = (tasks ?? []).filter((x) => x.status === "done").length;
  const { current, next, progress } = summary.level;
  const first = actor.effective.full_name.split(/\s+/)[0] ?? "";
  const testOn = await isVisible(actor, "module.placement");
  const next_ =
    placed || !testOn
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
              <Star aria-hidden className="size-4 text-[#fcd34d]" />
              {current ? localName(current, locale) : t("level", { n: 1 })} ·{" "}
              {t("xp", { xp: summary.xp })}
            </li>
            <li className="journey-chip">
              <Flame aria-hidden className="size-4 text-[#fdba74]" />
              {t("streak", { days: summary.streak.days })}
            </li>
            <li className="journey-chip">
              <Coins aria-hidden className="size-4 text-[#fde68a]" />
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

      <div className="flex flex-wrap justify-around gap-4 rounded-2xl bg-black/20 p-4">
        <ProgressRing onDark tone="gold" value={progress * 100} label={t("ringLevel")} />
        <ProgressRing
          onDark
          tone="green"
          value={tasks?.length ? (tasksDone / tasks.length) * 100 : null}
          display={tasks?.length ? `${tasksDone}/${tasks.length}` : undefined}
          label={t("ringTasks")}
        />
        <ProgressRing onDark tone="blue" value={accuracy} label={t("ringAccuracy")} />
        <ProgressRing
          onDark
          tone="rose"
          value={Math.min(100, (summary.streak.days / 7) * 100)}
          display={String(summary.streak.days)}
          label={t("ringStreak")}
        />
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
