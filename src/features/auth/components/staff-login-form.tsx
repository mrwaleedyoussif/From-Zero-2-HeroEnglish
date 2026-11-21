"use client";

import { useLocale, useTranslations } from "next-intl";
import { startTransition, useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type FormState, sendMagicLink, signInWithGoogle } from "../actions";

const initial: FormState = { status: "idle" };

export function StaffLoginForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  if (state.status === "sent") {
    return (
      <Alert role="status">
        <AlertDescription>{t("sent")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        action={action}
        className="flex flex-col gap-3"
        // Submit in a transition so a failed attempt keeps what was typed (React would reset it).
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
      >
        <input type="hidden" name="locale" value={locale} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            name="email"
            defaultValue={state.values?.email}
            type="email"
            autoComplete="email"
            dir="ltr"
            required
          />
        </div>
        {state.status === "error" && state.message && (
          <p role="alert" className="text-sm text-destructive">
            {t(`errors.${state.message}`)}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {t("sendLink")}
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t("or")}
        <span className="h-px flex-1 bg-border" />
      </div>
      <form action={signInWithGoogle}>
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" variant="outline" className="w-full">
          {t("google")}
        </Button>
      </form>
    </div>
  );
}
