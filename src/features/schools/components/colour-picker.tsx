"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { contrastRatio, MIN_CONTRAST, schoolTheme } from "@/lib/theme/contrast";
import { updateSchoolTheme } from "../theme-actions";

/** School brand colour with a live WCAG contrast check and preview (light + dark). */
export function ColourPicker({ schoolId, current }: { schoolId: string; current: string | null }) {
  const t = useTranslations("SchoolTheme");
  const [colour, setColour] = useState(current ?? "#1e3a8a");
  const result = schoolTheme(colour);
  const ratio = contrastRatio(colour, "#f8fafc").toFixed(2);

  return (
    <ActionForm action={updateSchoolTheme} resetOnSuccess={false} className="flex flex-col gap-3">
      <input type="hidden" name="school_id" value={schoolId} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="school-primary">{t("primary")}</Label>
          <input
            id="school-primary"
            name="primary"
            type="color"
            value={colour}
            onChange={(e) => setColour(e.target.value)}
            className="h-9 w-16 cursor-pointer rounded border border-input"
          />
        </div>
        <code dir="ltr" className="pb-2 text-sm">
          {colour}
        </code>
        <span
          className={`pb-2 text-sm ${result.ok ? "text-success" : "font-semibold text-destructive"}`}
          role="status"
        >
          {t("ratio", { ratio, min: MIN_CONTRAST })} — {result.ok ? t("passes") : t("fails")}
        </span>
      </div>
      {!result.ok && result.reason === "lowContrast" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setColour(result.suggestion)}
        >
          {t("useSuggestion", { colour: result.suggestion })}
        </Button>
      )}
      {result.ok && (
        <div className="flex flex-wrap gap-3">
          {(["light", "dark"] as const).map((mode) => (
            <span
              key={mode}
              className={`rounded-md px-4 py-2 text-sm font-medium ${mode === "dark" ? "outline outline-2 outline-offset-4 outline-[#0b1220]" : ""}`}
              style={{ background: result[mode].primary, color: result[mode].primaryForeground }}
            >
              {t(`preview.${mode}`)}
            </span>
          ))}
        </div>
      )}
      <Button type="submit" disabled={!result.ok} className="self-start">
        {t("save")}
      </Button>
    </ActionForm>
  );
}

/** Remove the override and go back to the default palette. */
export function ResetColour({ schoolId }: { schoolId: string }) {
  const t = useTranslations("SchoolTheme");
  return (
    <ActionForm action={updateSchoolTheme} resetOnSuccess={false}>
      <input type="hidden" name="school_id" value={schoolId} />
      <input type="hidden" name="primary" value="" />
      <Button type="submit" variant="ghost" size="sm">
        {t("reset")}
      </Button>
    </ActionForm>
  );
}
