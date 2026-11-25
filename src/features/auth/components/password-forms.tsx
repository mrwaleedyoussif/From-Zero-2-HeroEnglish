"use client";

import { useLocale, useTranslations } from "next-intl";
import { startTransition, useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "../actions";
import { passwordSignIn, setPassword } from "../password-actions";

const initial: FormState = { status: "idle" };

/** Sign in with email and password: for staff who set one in Account → Password. */
export function PasswordSignIn() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(passwordSignIn, initial);
  return (
    <form
      action={action}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw-email">{t("passwordEmail")}</Label>
        <Input
          id="pw-email"
          name="email"
          type="email"
          autoComplete="username"
          dir="ltr"
          defaultValue={state.values?.email}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw-password">{t("password")}</Label>
        <Input
          id="pw-password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {t("passwordSignIn")}
      </Button>
    </form>
  );
}

/** Choose or change the password used on the sign-in page. */
export function SetPasswordForm() {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState(setPassword, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.status === "sent" && (
        <Alert role="status">
          <AlertDescription>{t("passwordSaved")}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">{t("newPassword")}</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          dir="ltr"
          minLength={10}
          maxLength={72}
          required
        />
        <p className="text-sm text-[var(--z-soft)]">{t("passwordRule")}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
        <Input
          id="confirm-password"
          name="confirm"
          type="password"
          autoComplete="new-password"
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
        {t("savePassword")}
      </Button>
    </form>
  );
}
