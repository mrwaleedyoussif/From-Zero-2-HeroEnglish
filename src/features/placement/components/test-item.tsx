"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { answerAction, tabSwitchAction } from "../runtime/actions";
import type { PublicItem } from "../runtime/public-item";
import { AnswerInput } from "./answer-input";
import { Countdown } from "./countdown";

/**
 * One item per screen (SPEC §7). There is no back button: the server only accepts an answer
 * to the item it served. Leaving the page is counted; the item timer submits when it ends.
 */
export function TestItem({
  sessionId,
  item,
  answered,
  maxItems,
  deadline,
}: {
  sessionId: string;
  item: PublicItem;
  answered: number;
  maxItems: number;
  deadline: string | null;
}) {
  const t = useTranslations("Placement");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const [value, setValue] = useState<string | string[]>(item.type === "mcq_multi" ? [] : "");
  const [pending, start] = useTransition();
  const [left, setLeft] = useState(0);
  const sent = useRef(false);

  const submit = useCallback(() => {
    if (sent.current) return;
    sent.current = true;
    start(async () => {
      const r = await answerAction({ sessionId, itemId: item.id, answer: value });
      if (!r.ok && r.error !== "notCurrentItem" && r.error !== "alreadyAnswered") {
        sent.current = false;
        toast.error(tErrors(r.error));
        return;
      }
      router.refresh();
    });
  }, [item.id, router, sessionId, tErrors, value]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        setLeft((n) => n + 1);
        void tabSwitchAction(sessionId);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [sessionId]);

  const empty = Array.isArray(value) ? value.length === 0 : value.trim() === "";
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{t("questionOf", { n: answered + 1, max: maxItems })}</span>
        <span className="flex gap-4">
          {item.timeLimitSec && (
            <Countdown
              seconds={item.timeLimitSec}
              label={t("thisQuestion")}
              onDone={submit}
              key={item.id}
            />
          )}
          {deadline && (
            <Countdown until={deadline} label={t("wholeTest")} onDone={() => router.refresh()} />
          )}
        </span>
      </div>
      <progress
        className="h-2 w-full accent-primary"
        value={answered}
        max={maxItems}
        aria-label={t("progress")}
      />
      {left > 0 && (
        <p role="alert" className="rounded-md bg-warning/15 px-3 py-2 text-sm">
          {t("leftPage", { count: left })}
        </p>
      )}
      {item.passage && (
        <details open className="rounded-lg border border-border bg-card p-4">
          <summary className="cursor-pointer font-semibold">{item.passage.title}</summary>
          <p dir="ltr" className="mt-2 text-start leading-relaxed whitespace-pre-line">
            {item.passage.body}
          </p>
        </details>
      )}
      {item.mediaId && (
        <audio
          controls
          preload="auto"
          src={`/api/media/${item.mediaId}`}
          className="w-full"
          aria-label={t("listen")}
        />
      )}
      <h2 dir="ltr" className="text-start text-2xl font-semibold">
        {item.stem}
      </h2>
      <AnswerInput item={item} value={value} onChange={setValue} />
      <Button size="lg" className="h-12 text-lg" onClick={submit} disabled={pending || empty}>
        {pending ? t("saving") : t("next")}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t("noBack")}</p>
    </div>
  );
}
