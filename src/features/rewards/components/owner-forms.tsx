import { getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, SelectField, TextField } from "@/components/field";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/db";
import { addCatalogItem, retireCatalogItem, saveLevel, saveRule } from "../owner-actions";

/** One reward rule: amounts, anti-gaming thresholds, daily cap, scaling, on/off. */
export async function RuleForm({ r }: { r: Tables<"reward_rules"> }) {
  const t = await getTranslations("OwnerRewards");
  const p = `rule-${r.event_type}`;
  const num = (label: string, name: string, value: number | null, max?: number) => (
    <TextField
      idPrefix={p}
      label={label}
      name={name}
      type="number"
      min={0}
      max={max}
      defaultValue={value ?? ""}
      className="w-28"
    />
  );
  return (
    <ActionForm action={saveRule} resetOnSuccess={false} className="rounded-lg border p-3">
      <input type="hidden" name="event_type" value={r.event_type} />
      <p className="mb-2 font-medium" data-rule={r.event_type}>
        {t(`event.${r.event_type}`)}
      </p>
      <FormRow>
        {num(t("xp"), "xp", r.xp)}
        {num(t("coins"), "coins", r.coins)}
        {num(t("minSeconds"), "min_seconds", r.min_seconds)}
        {num(t("minAccuracy"), "min_accuracy", r.min_accuracy, 100)}
        {num(t("dailyCap"), "daily_cap", r.daily_cap)}
        <SelectField
          idPrefix={p}
          label={t("scaleLabel")}
          name="scale"
          defaultValue={r.scale}
          options={(["none", "level", "accuracy"] as const).map((v) => ({
            value: v,
            label: t(`scale.${v}`),
          }))}
        />
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="active"
            value="on"
            defaultChecked={r.active}
            className="size-4"
          />
          {t("active")}
        </label>
        <Button type="submit" size="sm">
          {t("save")}
        </Button>
      </FormRow>
    </ActionForm>
  );
}

type LevelRow = { level: number; name_en: string; name_ar: string; xp_required: number | "" };

export async function LevelForm({ l }: { l: LevelRow }) {
  const t = await getTranslations("OwnerRewards");
  const p = `lvl-${l.level}`;
  return (
    <ActionForm action={saveLevel} resetOnSuccess={false}>
      <FormRow>
        <TextField
          idPrefix={p}
          label={t("level")}
          name="level"
          type="number"
          defaultValue={l.level}
          readOnly
          className="w-20"
        />
        <TextField
          idPrefix={p}
          label={t("nameEn")}
          name="name_en"
          defaultValue={l.name_en}
          required
        />
        <TextField
          idPrefix={p}
          label={t("nameAr")}
          name="name_ar"
          defaultValue={l.name_ar}
          required
          dir="rtl"
        />
        <TextField
          idPrefix={p}
          label={t("xpRequired")}
          name="xp_required"
          type="number"
          min={0}
          defaultValue={l.xp_required}
          required
          className="w-32"
        />
        <Button type="submit" size="sm">
          {t("save")}
        </Button>
      </FormRow>
    </ActionForm>
  );
}

type Item = { id: string; name_en: string; emoji: string | null; kind: string; cost: number };

export async function CatalogEditor({ items }: { items: Item[] }) {
  const t = await getTranslations("OwnerRewards");
  return (
    <>
      <ul className="flex flex-col gap-1">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3">
            <span>
              {i.emoji} {i.name_en} · {t(`kind.${i.kind}`)} · {i.cost} 🪙
            </span>
            <ActionForm action={retireCatalogItem} successMessage="removed">
              <input type="hidden" name="id" value={i.id} />
              <Button type="submit" size="sm" variant="ghost">
                {t("retire")}
              </Button>
            </ActionForm>
          </li>
        ))}
      </ul>
      <ActionForm action={addCatalogItem}>
        <FormRow>
          <TextField
            idPrefix="cat"
            label={t("code")}
            name="code"
            required
            pattern="[a-z0-9\-]{2,40}"
            className="w-36"
          />
          <TextField idPrefix="cat" label={t("nameEn")} name="name_en" required />
          <TextField idPrefix="cat" label={t("nameAr")} name="name_ar" required dir="rtl" />
          <TextField
            idPrefix="cat"
            label={t("emoji")}
            name="emoji"
            maxLength={8}
            className="w-20"
          />
          <SelectField
            idPrefix="cat"
            label={t("kindLabel")}
            name="kind"
            defaultValue="cosmetic"
            options={[
              { value: "cosmetic", label: t("kind.cosmetic") },
              { value: "real", label: t("kind.real") },
            ]}
          />
          <TextField
            idPrefix="cat"
            label={t("cost")}
            name="cost"
            type="number"
            min={1}
            required
            className="w-24"
          />
          <Button type="submit">{t("add")}</Button>
        </FormRow>
      </ActionForm>
    </>
  );
}
