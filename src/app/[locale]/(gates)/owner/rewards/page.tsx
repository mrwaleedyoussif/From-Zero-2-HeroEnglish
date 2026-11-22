import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { CatalogEditor, LevelForm, RuleForm } from "@/features/rewards/components/owner-forms";
import { requirePermission } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

/** Owner tuning of rewards (SPEC §10: all rules are data): rules, levels, shop items. */
export default async function OwnerRewardsPage({ params }: PageProps<"/[locale]/owner/rewards">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "content:import", "page.owner.rewards");
  const t = await getTranslations("OwnerRewards");
  const db = await createClient();
  const [{ data: rules }, { data: levels }, { data: items }] = await Promise.all([
    db.from("reward_rules").select("*").order("event_type"),
    db.from("levels").select("level, name_en, name_ar, xp_required").order("level"),
    db
      .from("reward_catalog")
      .select("id, name_en, emoji, kind, cost")
      .is("school_id", null)
      .eq("status", "active")
      .order("cost"),
  ]);
  const next = {
    level: (levels?.length ?? 0) + 1,
    name_en: "",
    name_ar: "",
    xp_required: "" as const,
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} description={t("intro")} />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("rules")}</h2>
        <p className="text-sm text-muted-foreground">{t("rulesHelp")}</p>
        {(rules ?? []).map((r) => (
          <RuleForm key={r.event_type} r={r} />
        ))}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("levels")}</h2>
        {[...(levels ?? []), next].map((l) => (
          <LevelForm key={l.level} l={l} />
        ))}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("shop")}</h2>
        <p className="text-sm text-muted-foreground">{t("shopHelp")}</p>
        <CatalogEditor items={items ?? []} />
      </section>
    </div>
  );
}
