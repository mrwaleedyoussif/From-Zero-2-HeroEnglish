"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Fragment, type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { playCheer } from "@/features/rewards/sounds";
import { submitAnswers } from "../actions";
import type { PublicQuestion } from "../schema";
import { type Checked, UnitQuestion } from "./unit-question";

/**
 * One exercise: the learner answers every question, then submits them together. The Submit
 * button wakes up only when nothing is left empty. Wrong answers come back with a hint and can
 * be changed and submitted again; the rest are settled and show their answers.
 */
export function QuestionSet({
  unitId,
  set,
  questions,
  from,
  initial,
  before,
}: {
  unitId: string;
  set: string;
  questions: PublicQuestion[];
  /** Number of the first question. */
  from: number;
  /** What the learner did earlier (the page was reloaded). */
  initial: Record<string, Checked>;
  before?: Record<string, ReactNode>;
}) {
  const t = useTranslations("Units");
  const router = useRouter();
  const [checked, setChecked] = useState(initial);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(initial).map(([id, c]) => [id, c.choice])),
  );
  const [pending, start] = useTransition();
  const open = questions.filter((q) => !checked[q.id]?.answer);
  const empty = open.filter((q) => !values[q.id]?.trim()).length;
  const retry = open.some((q) => checked[q.id]);

  const submit = () =>
    start(async () => {
      const sent = Object.fromEntries(open.map((q) => [q.id, values[q.id] ?? ""]));
      const r = await submitAnswers(unitId, set, sent);
      if (!r.ok || !r.data) return void toast.error(t("notSaved"));
      const next = { ...checked };
      for (const [id, f] of Object.entries(r.data)) next[id] = { ...f, choice: sent[id] ?? "" };
      setChecked(next);
      const right = Object.values(r.data).filter((f) => f.correct !== false).length;
      playCheer(right === open.length ? "good" : "tryAgain");
      // A finished exercise can open the next lesson: refresh the page around it.
      router.refresh();
    });

  return (
    <>
      <ol className="flex flex-col gap-6">
        {questions.map((q, i) => (
          <Fragment key={q.id}>
            {before?.[q.id] && <li className="flex flex-col gap-3">{before[q.id]}</li>}
            <UnitQuestion
              number={from + i}
              q={q}
              value={values[q.id] ?? ""}
              onChange={(v) => setValues((old) => ({ ...old, [q.id]: v }))}
              checked={checked[q.id]}
              busy={pending}
            />
          </Fragment>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3" data-submit={set}>
        {open.length > 0 ? (
          <>
            <Button onClick={submit} disabled={pending || empty > 0} size="lg">
              <Send aria-hidden className="size-4" />
              {retry ? t("submitAgain") : t("submit")}
            </Button>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {empty > 0 ? t("answerAll", { n: empty }) : t("readyToSubmit")}
            </p>
          </>
        ) : (
          <p className="unit-feedback rounded-xl px-3 py-2 font-semibold" data-kind="right">
            ✅{" "}
            {t("setDone", {
              right: questions.filter((q) => checked[q.id]?.correct !== false).length,
              total: questions.length,
            })}
          </p>
        )}
      </div>
    </>
  );
}
