"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AnswerInput } from "@/features/placement/components/answer-input";
import type { PublicItem } from "@/features/placement/runtime/public-item";
import { completeLesson, openLesson } from "../lessons/actions";
import type { AwardOutcome } from "@/features/rewards/award";
import { Celebration } from "@/features/rewards/components/celebration";
import { Cheer } from "@/features/rewards/components/cheer";

/** Short practice check at the end of a lesson; marks the lesson (and its assignments) done. */
export function PracticeCheck({
  lessonId,
  items,
  readOnly,
}: {
  lessonId: string;
  items: PublicItem[];
  readOnly: boolean;
}) {
  const t = useTranslations("Learning");
  const tErrors = useTranslations("Errors");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [result, setResult] = useState<{
    score: number | null;
    correct: Set<string>;
    reward: AwardOutcome | null;
  } | null>(null);
  const [pending, start] = useTransition();
  const opened = useRef(0);

  useEffect(() => {
    opened.current = Date.now();
    if (!readOnly) void openLesson(lessonId);
  }, [lessonId, readOnly]);

  const submit = () =>
    start(async () => {
      const r = await completeLesson(lessonId, {
        answers: items.map((i) => ({ itemId: i.id, answer: answers[i.id] ?? "" })),
        seconds: Math.round((Date.now() - opened.current) / 1000),
      });
      if (!r.ok) return void toast.error(tErrors(r.error));
      const data = r.data ?? { score: null, results: [], reward: null };
      setResult({
        score: data.score,
        correct: new Set(data.results.filter((x) => x.correct).map((x) => x.itemId)),
        reward: data.reward,
      });
      toast.success(t("lessonDone"));
    });

  if (result) {
    return (
      <div className="rounded-lg border-2 border-primary p-4 text-center" data-done>
        <p className="text-2xl">🎉 {t("lessonDone")}</p>
        {result.score !== null && <Cheer score={result.score} />}
        {result.score !== null && (
          <p className="text-lg">{t("yourScore", { score: result.score })}</p>
        )}
        {result.reward && <Celebration reward={result.reward} />}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      {items.length > 0 && <h2 className="text-xl font-semibold">{t("practice")}</h2>}
      {items.map((item, n) => (
        <div key={item.id} className="flex flex-col gap-3 rounded-lg border p-4">
          {item.passage && (
            <div dir="ltr" className="rounded-md bg-muted p-3 text-start">
              <p className="font-medium">{item.passage.title}</p>
              <p className="whitespace-pre-wrap">{item.passage.body}</p>
            </div>
          )}
          {item.mediaId && <audio controls src={`/api/media/${item.mediaId}`} className="w-full" />}
          <p dir="ltr" className="text-start text-lg font-medium">
            {n + 1}. {item.stem}
          </p>
          <AnswerInput
            item={item}
            value={answers[item.id] ?? (item.type === "mcq_multi" ? [] : "")}
            onChange={(v) => setAnswers((a) => ({ ...a, [item.id]: v }))}
            name={`answer-${item.id}`}
          />
        </div>
      ))}
      {!readOnly && (
        <Button size="lg" className="h-12 self-start text-lg" onClick={submit} disabled={pending}>
          {pending ? t("saving") : items.length ? t("checkAnswers") : t("markDone")}
        </Button>
      )}
    </section>
  );
}
