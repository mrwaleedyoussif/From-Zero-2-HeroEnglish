import { getLocale, getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/i18n-names";
import type { RewardsSummary } from "../queries";

/** Earned badges in colour; badges still to earn are shown faded with how to earn them. */
export async function BadgeGrid({ badges }: { badges: RewardsSummary["badges"] }) {
  const t = await getTranslations("Rewards");
  const locale = await getLocale();
  if (badges.length === 0) return <p className="text-muted-foreground">{t("noBadges")}</p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {badges.map((b) => (
        <li
          key={b.id}
          data-badge={b.code}
          data-earned={b.awardedAt ? "yes" : "no"}
          className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center ${
            b.awardedAt ? "border-reward bg-reward/15" : "opacity-60 grayscale"
          }`}
        >
          {b.media_asset_id ? (
            // eslint-disable-next-line @next/next/no-img-element -- private media proxy
            <img src={`/api/media/${b.media_asset_id}`} alt="" className="size-12" />
          ) : (
            <span className="text-4xl" aria-hidden>
              {b.awardedAt ? "🏆" : "🔒"}
            </span>
          )}
          <span className="font-medium">{locale === "ar" ? b.name_ar : b.name_en}</span>
          {b.description && (
            <span dir="auto" className="text-xs text-muted-foreground">
              {b.description}
            </span>
          )}
          <span className="sr-only">{b.awardedAt ? t("earned") : t("notYet")}</span>
          {b.awardedAt && (
            <span className="text-xs text-muted-foreground">{formatDate(b.awardedAt, locale)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
