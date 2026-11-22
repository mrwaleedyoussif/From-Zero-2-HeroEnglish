"use client";

import { useLocale, useTranslations } from "next-intl";
import type { AwardOutcome } from "../award";

/**
 * What a learner just earned. Celebratory but accessible: announced to screen readers
 * (role="status"), and the bounce only plays when the device allows motion.
 */
export function Celebration({ reward }: { reward: AwardOutcome }) {
  const t = useTranslations("Rewards");
  const locale = useLocale();
  if (reward.xp === 0 && reward.coins === 0 && reward.badges.length === 0) return null;
  const levelUp = reward.levels.at(-1);
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-2"
      data-celebration
    >
      <div className="flex gap-3 text-3xl" aria-hidden>
        <span className="motion-safe:animate-bounce">⭐</span>
        {reward.badges.length > 0 && (
          <span className="[animation-delay:150ms] motion-safe:animate-bounce">🏆</span>
        )}
        {levelUp && <span className="[animation-delay:300ms] motion-safe:animate-bounce">🚀</span>}
      </div>
      <p className="text-lg font-semibold">
        {t("earnedNow", { xp: reward.xp, coins: reward.coins })}
      </p>
      {reward.badges.length > 0 && <p>{t("newBadges", { count: reward.badges.length })}</p>}
      {levelUp && (
        <p className="font-semibold text-primary">
          {t("levelUp", { name: locale === "ar" ? levelUp.name_ar : levelUp.name_en })}
        </p>
      )}
    </div>
  );
}
