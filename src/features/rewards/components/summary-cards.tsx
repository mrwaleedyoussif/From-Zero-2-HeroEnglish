import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RewardsSummary } from "../queries";

/** Level + XP bar, coins and streak (each part can be hidden by visibility). */
export async function SummaryCards({
  summary,
  showCoins,
  showStreak,
}: {
  summary: RewardsSummary;
  showCoins: boolean;
  showStreak: boolean;
}) {
  const t = await getTranslations("Rewards");
  const locale = await getLocale();
  const { level, xp, coins, streak } = summary;
  const name = (l: { name_en: string; name_ar: string } | null) =>
    l ? (locale === "ar" ? l.name_ar : l.name_en) : "—";
  const pct = Math.round(level.progress * 100);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card data-level={level.current?.level ?? 0} className="sm:col-span-3 lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span aria-hidden>🏅</span> {name(level.current)}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("toNext")}
            className="h-3 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-reward" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-sm text-muted-foreground" data-xp={xp}>
            {level.next
              ? t("xpToNext", { xp, next: level.next.xp_required, name: name(level.next) })
              : t("xpTop", { xp })}
          </p>
        </CardContent>
      </Card>
      {showCoins && (
        <Card data-coins={coins}>
          <CardHeader>
            <CardTitle className="text-lg">
              <span aria-hidden>🪙</span> {t("coins", { n: coins })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{t("coinsHelp")}</CardContent>
        </Card>
      )}
      {showStreak && (
        <Card data-streak={streak.days}>
          <CardHeader>
            <CardTitle className="text-lg">
              <span aria-hidden>🔥</span> {t("streak", { n: streak.days })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("longest", { n: streak.longest })} ·{" "}
            {streak.freezeUsed ? t("freezeUsed") : t("freezeReady")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
