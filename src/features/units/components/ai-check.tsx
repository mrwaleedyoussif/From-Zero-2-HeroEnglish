"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { testAiReader } from "../ai-check-action";

/** Owner: a button that checks the AI writing reader and says what to fix if it is not working. */
export function AiCheck() {
  const t = useTranslations("Units");
  const te = useTranslations("Errors");
  const [answer, setAnswer] = useState<string | null>(null);
  const [good, setGood] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4" data-ai-check>
      <p className="text-sm text-muted-foreground">{t("aiCheckHelp")}</p>
      <Button
        variant="outline"
        className="self-start"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await testAiReader();
            if (!r.ok || !r.data) return setAnswer(te(r.ok ? "failed" : r.error));
            setGood(r.data.result === "ok");
            setDetail(r.data.detail ?? null);
            setAnswer(
              t(`aiCheck.${r.data.result}`, {
                model: r.data.model,
                status: String(r.data.status ?? "—"),
              }),
            );
          })
        }
      >
        <Sparkles aria-hidden className="size-4" />
        {pending ? t("aiChecking") : t("aiCheckButton")}
      </Button>
      {answer && (
        <p
          aria-live="polite"
          data-ai-result={good ? "ok" : "problem"}
          className="unit-feedback rounded-xl px-3 py-2 text-sm font-medium"
          data-kind={good ? "right" : "hint"}
        >
          {answer}
          {detail && (
            <span dir="ltr" className="mt-1 block font-normal" data-ai-detail>
              {t("aiCheckDetail")} <code>{detail}</code>
            </span>
          )}
        </p>
      )}
    </div>
  );
}
