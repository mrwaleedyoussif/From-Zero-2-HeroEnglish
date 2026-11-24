"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playCheer } from "@/features/rewards/sounds";
import { answerQuestion, type Feedback } from "../actions";
import type { PublicQuestion } from "../schema";

const TFNG = ["True", "False", "Not Given"] as const;

/** Arabic support under an English line. */
function Ar({ children }: { children: string }) {
  return (
    <span lang="ar" dir="rtl" className="block text-sm opacity-90">
      {children}
    </span>
  );
}

/**
 * One question. The answer is checked on the server; a wrong try gets a gentle nudge and the
 * next hint, a right one a small celebration, and a settled question shows the answer and why.
 */
export function UnitQuestion({
  unitId,
  number,
  q,
  settled,
}: {
  unitId: string;
  number: number;
  q: PublicQuestion;
  /** What the learner already finished earlier (the page was reloaded). */
  settled?: Feedback & { choice: string };
}) {
  const t = useTranslations("Units");
  const [feedback, setFeedback] = useState<Feedback | null>(settled ?? null);
  const [picked, setPicked] = useState(settled?.choice ?? "");
  const [typed, setTyped] = useState(settled?.choice ?? "");
  const [pending, start] = useTransition();
  const done = !!feedback?.answer;

  const send = (choice: string) => {
    if (!choice.trim() || done) return;
    setPicked(choice);
    start(async () => {
      const r = await answerQuestion(unitId, q.id, choice);
      if (!r.ok || !r.data) return;
      setFeedback(r.data);
      playCheer(r.data.correct === false ? "tryAgain" : "good");
    });
  };
  const mark = (value: string) =>
    picked.toLowerCase() !== value.toLowerCase() || !feedback
      ? undefined
      : feedback.correct === false
        ? "wrong"
        : feedback.correct
          ? "right"
          : undefined;
  const choices =
    q.type === "mcq"
      ? Object.entries(q.options ?? {}).map(([k, v]) => ({
          value: k,
          text: `${k.toUpperCase()}. ${v}`,
        }))
      : q.type === "tfng"
        ? TFNG.map((v) => ({ value: v, text: t(`tfng.${v}`) }))
        : null;

  return (
    <li data-question={q.id} data-done={done} className="flex flex-col gap-3">
      <p className="font-semibold">
        <span className="unit-chip me-2 inline-flex size-7 items-center justify-center rounded-full text-sm">
          {number}
        </span>
        {q.stem}
      </p>
      {q.events && (
        <ol className="flex flex-col gap-1 ps-2 text-sm">
          {q.events.map((e, i) => (
            <li key={e}>
              <strong>{String.fromCharCode(97 + i)}.</strong> {e}
            </li>
          ))}
        </ol>
      )}
      {choices ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {choices.map((c) => (
            <button
              key={c.value}
              type="button"
              disabled={pending || done}
              data-picked={mark(c.value)}
              onClick={() => send(c.value)}
              className="unit-option min-h-11 rounded-xl px-3 py-2 text-start text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
            >
              {c.text}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(typed);
          }}
        >
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={pending || done}
            aria-label={q.type === "sequence" ? t("orderHelp") : t("yourAnswer")}
            placeholder={q.type === "sequence" ? t("orderHelp") : t("yourAnswer")}
            dir="ltr"
            className="max-w-md flex-1"
          />
          <Button type="submit" disabled={pending || done || !typed.trim()}>
            {t("check")}
          </Button>
        </form>
      )}
      <div aria-live="polite">
        {feedback?.correct && (
          <p className="unit-feedback rounded-xl px-3 py-2 font-semibold" data-kind="right">
            ⭐ {t("right")}
          </p>
        )}
        {feedback?.correct === false && !done && (
          <div className="unit-feedback rounded-xl px-3 py-2" data-kind="hint">
            <p className="font-semibold">{t("tryAgain")}</p>
            {feedback.hint && (
              <p>
                💡 {feedback.hint.en}
                <Ar>{feedback.hint.ar}</Ar>
              </p>
            )}
          </div>
        )}
        {done && (
          <div className="unit-feedback mt-2 rounded-xl px-3 py-2" data-kind="answer">
            <p>
              <strong>{feedback.correct === null ? t("model") : t("answer")}:</strong>{" "}
              {feedback.answer}
            </p>
            {feedback.explanation && (
              <p className="mt-1 text-sm">
                {feedback.explanation.en}
                <Ar>{feedback.explanation.ar}</Ar>
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
