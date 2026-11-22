import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaderboardCard } from "@/features/rewards/components/leaderboard-card";
import { boards, myClass, rewardsSummary } from "@/features/rewards/queries";
import { Link } from "@/i18n/navigation";
import { isVisible } from "@/lib/visibility/server";
import type { WidgetProps } from ".";

/** Student home: level, XP and streak at a glance. */
export async function StudentStreakWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Registry");
  const tr = await getTranslations("Rewards");
  const locale = await getLocale();
  const s = await rewardsSummary(actor.effective.id);
  const showStreak = await isVisible(actor, "feature.streaks");
  const level = s.level.current;
  return (
    <Card data-widget="widget.student.streak">
      <CardHeader>
        <CardTitle className="text-base">{t("widget.student.streak")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-lg">
        {showStreak && (
          <span>
            <span aria-hidden>🔥</span> {tr("streak", { n: s.streak.days })}
          </span>
        )}
        <span>
          <span aria-hidden>🏅</span>{" "}
          {level ? (locale === "ar" ? level.name_ar : level.name_en) : "—"} ·{" "}
          {tr("xpShort", { n: s.xp })}
        </span>
      </CardContent>
    </Card>
  );
}

/** Student home: latest badges earned. */
export async function StudentBadgesWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Registry");
  const tr = await getTranslations("Rewards");
  const locale = await getLocale();
  const earned = (await rewardsSummary(actor.effective.id)).badges
    .filter((b) => b.awardedAt)
    .sort((a, b) => (b.awardedAt ?? "").localeCompare(a.awardedAt ?? ""))
    .slice(0, 4);
  return (
    <Card data-widget="widget.student.badges">
      <CardHeader>
        <CardTitle className="text-base">{t("widget.student.badges")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {earned.length === 0 && <p className="text-sm text-muted-foreground">{tr("firstBadge")}</p>}
        <ul className="flex flex-wrap gap-2">
          {earned.map((b) => (
            <li key={b.id} className="rounded-full bg-reward/15 px-3 py-1 text-sm">
              🏆 {locale === "ar" ? b.name_ar : b.name_en}
            </li>
          ))}
        </ul>
        <Button asChild variant="outline" size="sm" className="self-start">
          <Link href="/student/rewards">{tr("seeAll")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** Student home: this week's class leaderboard (when the class and visibility allow it). */
export async function StudentLeaderboardWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Registry");
  const tr = await getTranslations("Rewards");
  const cls = await myClass(actor.effective.id);
  if (!cls || !cls.leaderboardOn || !(await isVisible(actor, "feature.leaderboards")))
    return (
      <Card data-widget="widget.student.leaderboard">
        <CardHeader>
          <CardTitle className="text-base">{t("widget.student.leaderboard")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{tr("boardOff")}</CardContent>
      </Card>
    );
  const b = await boards(cls.id, actor.effective.id);
  return (
    <div data-widget="widget.student.leaderboard">
      <LeaderboardCard
        title={t("widget.student.leaderboard")}
        board={{ top: b.students.top.slice(0, 5), me: b.students.me }}
        name={b.studentName}
        me={actor.effective.id}
        testId="widget"
      />
    </div>
  );
}
