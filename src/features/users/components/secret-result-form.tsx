"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, startTransition, useActionState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Result =
  { ok: true; data?: { pin: string; username?: string } } | { ok: false; error: string } | null;

/**
 * Form whose action returns a one-time secret (new PIN). The PIN is shown once here and
 * never stored in plain text, so the person must write it down or print the class cards.
 */
export function SecretResultForm({
  action,
  children,
  className,
}: {
  action: (prev: Result, form: FormData) => Promise<Result>;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations("Users");
  const tErrors = useTranslations("Errors");
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div className="flex flex-col gap-3">
      <form
        className={className}
        aria-busy={pending}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        <fieldset disabled={pending} className="contents">
          {children}
        </fieldset>
      </form>
      {state?.ok && state.data && (
        <Alert role="status">
          <AlertTitle>{t("pinOnce")}</AlertTitle>
          <AlertDescription>
            <span dir="ltr" className="font-mono text-lg">
              {state.data.username && `${state.data.username} · `}
              {state.data.pin}
            </span>
          </AlertDescription>
        </Alert>
      )}
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {tErrors(state.error)}
        </p>
      )}
    </div>
  );
}
