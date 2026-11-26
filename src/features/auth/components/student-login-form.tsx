"use client";

import { useLocale, useTranslations } from "next-intl";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SecretInput } from "@/components/secret-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type FormState, studentSignIn } from "../actions";

const initial: FormState = { status: "idle" };

export function StudentLoginForm({ defaultSchool }: { defaultSchool?: string }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(studentSignIn, initial);
  const pinRef = useRef<HTMLInputElement>(null);

  // After a failed attempt keep school code + username, but clear and refocus the PIN.
  useEffect(() => {
    if (state.status !== "error" || !pinRef.current) return;
    pinRef.current.value = "";
    pinRef.current.focus();
  }, [state]);

  return (
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
        <Label htmlFor="schoolCode">{t("schoolCode")}</Label>
        <Input
          id="schoolCode"
          name="schoolCode"
          defaultValue={state.values?.schoolCode ?? defaultSchool}
          dir="ltr"
          autoCapitalize="characters"
          autoComplete="organization"
          required
          className="uppercase"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">{t("username")}</Label>
        <Input
          id="username"
          name="username"
          defaultValue={state.values?.username}
          dir="ltr"
          autoCapitalize="none"
          autoComplete="username"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pin">{t("pin")}</Label>
        <SecretInput
          id="pin"
          ref={pinRef}
          name="pin"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          dir="ltr"
          autoComplete="current-password"
          required
          className="tracking-[0.5em]"
        />
      </div>
      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.message}`)}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {t("signIn")}
      </Button>
    </form>
  );
}
