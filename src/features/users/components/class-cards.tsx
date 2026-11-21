"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { generateClassCards } from "../cards-actions";
import { LoginCardsGrid } from "../import/login-cards-grid";

export function ClassCards({ classId, studentCount }: { classId: string; studentCount: number }) {
  const t = useTranslations("Cards");
  const tErrors = useTranslations("Errors");
  const [state, action, pending] = useActionState(generateClassCards, null);

  if (state?.ok && state.data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <Button onClick={() => window.print()}>{t("print")}</Button>
          <span className="text-sm text-muted-foreground">{t("printHint")}</span>
        </div>
        <LoginCardsGrid cards={state.data} />
      </div>
    );
  }

  return (
    <form
      action={action}
      className="flex flex-col items-start gap-3"
      onSubmit={(e) => {
        if (!window.confirm(t("confirm", { count: studentCount }))) e.preventDefault();
      }}
    >
      <input type="hidden" name="class_id" value={classId} />
      <Alert>
        <AlertDescription>{t("warning")}</AlertDescription>
      </Alert>
      <Button type="submit" disabled={pending || studentCount === 0}>
        {t("generate", { count: studentCount })}
      </Button>
      {state && !state.ok && (
        <p role="alert" className="text-destructive">
          {tErrors(state.error)}
        </p>
      )}
    </form>
  );
}
