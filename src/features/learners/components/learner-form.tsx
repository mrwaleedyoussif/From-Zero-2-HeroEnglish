"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type LearnerState, requestCode, verifyCode } from "../actions";

/** Email first; then the one-time code from the email. No password anywhere. */
export function LearnerForm() {
  const t = useTranslations("Learner");
  const locale = useLocale();
  const [sent, send, sending] = useActionState(requestCode, { step: "email" } as LearnerState);
  const [checked, check, checking] = useActionState(verifyCode, { step: "code" } as LearnerState);
  // A failed check can send the learner back to the email step (e.g. account switched off).
  const state = checked.error && checked.step === "email" ? checked : sent;
  const error = state.step === "code" ? (checked.error ?? state.error) : state.error;

  return (
    <div className="flex flex-col gap-4">
      {state.step === "email" ? (
        <form action={send} className="flex flex-col gap-3">
          <input type="hidden" name="locale" value={locale} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="learner-email">{t("email")}</Label>
            <Input
              id="learner-email"
              name="email"
              type="email"
              autoComplete="email"
              dir="ltr"
              required
            />
          </div>
          <Button type="submit" disabled={sending}>
            {t("sendCode")}
          </Button>
        </form>
      ) : (
        <form action={check} className="flex flex-col gap-3">
          <Alert role="status">
            <AlertDescription>{t("codeSent", { email: state.email ?? "" })}</AlertDescription>
          </Alert>
          <input type="hidden" name="email" value={state.email ?? ""} />
          <input type="hidden" name="locale" value={locale} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="learner-code">{t("code")}</Label>
            <Input
              id="learner-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,10}"
              dir="ltr"
              required
              autoFocus
              className="text-center text-xl tracking-widest"
            />
          </div>
          <Button type="submit" disabled={checking}>
            {t("verify")}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${error}`)}
        </p>
      )}
    </div>
  );
}
