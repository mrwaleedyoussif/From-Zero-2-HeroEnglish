"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import type { Feedback } from "../actions";
import type { PublicQuestion } from "../schema";
import { OrderPicker } from "./order-picker";

const TFNG = ["True", "False", "Not Given"] as const;

/** Arabic support under an English line. */
function Ar({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <span lang="ar" dir="rtl" className="block text-sm opacity-90">
      {children}
    </span>
  );
}

/** What a question shows after a submit: the feedback, and the answer it was given for. */
export type Checked = Feedback & { choice: string };

/**
 * One question of an exercise. The learner chooses or types; nothing is checked until the whole
 * exercise is submitted. After that a wrong try shows its hint and stays open, and a settled
 * question shows the answer and why.
 */
export function UnitQuestion({
  number,
  q,
  value,
  onChange,
  checked,
  busy,
}: {
  number: number;
  q: PublicQuestion;
  value: string;
  onChange: (value: string) => void;
  checked?: Checked;
  busy: boolean;
}) {
  const t = useTranslations("Units");
  const done = !!checked?.answer;
  const off = busy || done;
  const mark = (option: string) =>
    !checked || checked.choice !== option || value !== option
      ? undefined
      : checked.correct === false
        ? "wrong"
        : checked.correct
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
      <p dir="auto" className="text-start font-semibold">
        <span className="unit-chip me-2 inline-flex size-7 items-center justify-center rounded-full text-sm">
          {number}
        </span>
        {q.stem}
      </p>
      {choices ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {choices.map((c) => (
            <button
              key={c.value}
              type="button"
              dir="auto"
              disabled={off}
              aria-pressed={value === c.value}
              data-picked={mark(c.value) ?? (value === c.value ? "chosen" : undefined)}
              onClick={() => onChange(c.value)}
              className="unit-option min-h-11 rounded-xl px-3 py-2 text-start text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
            >
              {c.text}
            </button>
          ))}
        </div>
      ) : q.events ? (
        <OrderPicker
          events={q.events}
          value={value}
          onChange={onChange}
          disabled={off}
          label={t("orderHelp")}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={off}
          aria-label={`${t("yourAnswer")} ${number}`}
          placeholder={t("yourAnswer")}
          dir="ltr"
          className="max-w-md"
        />
      )}
      <div aria-live="polite">
        {checked?.correct && (
          <p
            className="unit-feedback rounded-xl px-3 py-2 font-semibold"
            data-kind="right"
            data-verdict="right"
          >
            ✓ {t("right")}
          </p>
        )}
        {checked?.correct === false && !done && (
          <div className="unit-feedback rounded-xl px-3 py-2" data-kind="hint">
            <p className="font-semibold whitespace-pre-line">{t("tryAgain")}</p>
            {checked.hint && (
              <p>
                💡 {checked.hint.en}
                <Ar>{checked.hint.ar}</Ar>
              </p>
            )}
          </div>
        )}
        {done && (
          <div className="unit-feedback mt-2 rounded-xl px-3 py-2" data-kind="answer">
            {checked.correct === false && (
              <p className="font-semibold text-destructive" data-verdict="wrong">
                ✗ {t("wrong")}
              </p>
            )}
            <p>
              <strong>{checked.correct === null ? t("model") : t("answer")}:</strong>{" "}
              {checked.answer}
            </p>
            {checked.explanation && (
              <p className="mt-1 text-sm">
                {checked.explanation.en}
                <Ar>{checked.explanation.ar}</Ar>
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
