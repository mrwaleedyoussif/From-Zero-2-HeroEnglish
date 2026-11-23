"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeProfile } from "../actions";

/** Asked once: name, that the learner is an adult, and agreement to how their data is used. */
export function WelcomeForm() {
  const t = useTranslations("Learner");
  const locale = useLocale();
  const [state, action, pending] = useActionState(completeProfile, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="learner-name">{t("fullName")}</Label>
        <Input id="learner-name" name="full_name" autoComplete="name" required maxLength={80} />
      </div>
      {(["adult", "terms"] as const).map((k) => (
        <label key={k} className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name={k} required className="mt-0.5 size-5 shrink-0" />
          <span>{t(k)}</span>
        </label>
      ))}
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {t("finish")}
      </Button>
    </form>
  );
}
