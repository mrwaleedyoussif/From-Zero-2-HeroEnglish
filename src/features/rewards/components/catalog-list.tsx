import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/i18n-names";
import { redeem } from "../actions";
import type { RewardsSummary } from "../queries";

type Item = {
  id: string;
  name_en: string;
  name_ar: string;
  emoji: string | null;
  kind: string;
  cost: number;
  needs_approval: boolean;
};

/** Spend coins: cosmetic items at once, real rewards after the teacher approves. */
export async function CatalogList({
  items,
  coins,
  redemptions,
  readOnly,
}: {
  items: Item[];
  coins: number;
  redemptions: RewardsSummary["redemptions"];
  readOnly: boolean;
}) {
  const t = await getTranslations("Rewards");
  const locale = await getLocale();
  const name = (i: { name_en: string; name_ar: string }) =>
    locale === "ar" ? i.name_ar : i.name_en;
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {items.map((i) => (
          <li
            key={i.id}
            className="flex flex-col gap-2 rounded-xl border p-3"
            data-item={i.name_en}
          >
            <span className="text-3xl" aria-hidden>
              {i.emoji ?? "🎁"}
            </span>
            <span className="font-medium">{name(i)}</span>
            <span className="text-sm text-muted-foreground">
              {t("cost", { n: i.cost })} · {i.needs_approval ? t("needsTeacher") : t("instant")}
            </span>
            {!readOnly && (
              <ActionForm
                action={redeem}
                successMessage={i.needs_approval ? "requested" : "redeemed"}
              >
                <input type="hidden" name="item_id" value={i.id} />
                <Button type="submit" size="sm" disabled={coins < i.cost}>
                  {t("redeem")}
                </Button>
              </ActionForm>
            )}
          </li>
        ))}
      </ul>
      {redemptions.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold">{t("myRequests")}</h3>
          <ul className="text-sm">
            {redemptions.map((r) => (
              <li key={r.id} data-redemption={r.status}>
                {r.reward_catalog?.emoji} {r.reward_catalog ? name(r.reward_catalog) : ""} —{" "}
                {t(`redemption.${r.status}`)} · {formatDate(r.created_at, locale)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
