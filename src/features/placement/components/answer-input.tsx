"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import type { PublicItem } from "../runtime/public-item";

/** The answer control for one item type. Large targets for young learners on tablets. */
export function AnswerInput({
  item,
  value,
  onChange,
  name = "answer",
}: {
  item: PublicItem;
  value: string | string[];
  onChange: (v: string | string[]) => void;
  /** Field name/id; distinct per item when several items share a page. */
  name?: string;
}) {
  const t = useTranslations("Placement");
  const choice =
    "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border-2 border-border bg-card px-4 py-3 text-lg has-[:checked]:border-primary has-[:checked]:bg-primary/10";

  if (item.type === "mcq_single" || item.type === "true_false") {
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{t("chooseOne")}</legend>
        {item.options.map((o) => (
          <label key={o.label} className={choice}>
            <input
              type="radio"
              name={name}
              value={o.label}
              checked={value === o.label}
              onChange={() => onChange(o.label)}
              className="size-5"
            />
            <span dir="auto">{o.body}</span>
          </label>
        ))}
      </fieldset>
    );
  }
  if (item.type === "mcq_multi") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-muted-foreground">{t("chooseAll")}</legend>
        {item.options.map((o) => (
          <label key={o.label} className={choice}>
            <input
              type="checkbox"
              checked={selected.includes(o.label)}
              onChange={(e) =>
                onChange(
                  e.target.checked ? [...selected, o.label] : selected.filter((l) => l !== o.label),
                )
              }
              className="size-5"
            />
            <span dir="auto">{o.body}</span>
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm text-muted-foreground">
        {item.type === "matching" || item.type === "ordering" ? t("typeOrder") : t("typeAnswer")}
      </label>
      <Input
        id={name}
        dir="ltr"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 text-lg"
      />
    </div>
  );
}
