"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { saveHandwriting } from "../actions";
import { type Grade, type Mode, PASS } from "../strokes/grade";
import type { Style } from "../types";
import { Result } from "./result";
import { StrokeDemo } from "./stroke-demo";
import { StrokePad } from "./stroke-pad";

type Step = "watch" | Mode;
const STEPS: readonly Step[] = ["watch", "trace", "write"];
const tab = (on: boolean) =>
  `flex min-h-14 min-w-36 flex-1 flex-col items-start rounded-2xl border-2 px-4 py-2 text-start ${on ? "border-primary bg-primary/10" : "border-border bg-background"}`;
const go =
  "inline-flex min-h-11 items-center self-start rounded-full border-2 border-primary bg-primary px-5 font-semibold text-primary-foreground";

/**
 * One item in three steps, as in the school's cursive booklet: watch the app write it, trace
 * over the model, then write it alone on the lines. Each try is marked and the best is kept.
 */
export function Practice({
  step,
  style,
  text,
  best,
}: {
  step: string;
  style: Style;
  text: string;
  best: { trace: number | null; write: number | null };
}) {
  const t = useTranslations("Handwriting");
  const [at, setAt] = useState<Step>("watch");
  const [mark, setMark] = useState<Grade | null>(null);
  const [isBest, setIsBest] = useState(false);
  const [bests, setBests] = useState(best);
  const [, start] = useTransition();
  const open = (s: Step) => {
    setAt(s);
    setMark(null);
  };
  const onGrade = (g: Grade | null) => {
    setMark(g);
    if (!g || g.empty || at === "watch") return;
    const mode = at;
    setIsBest(bests[mode] !== null && g.score > (bests[mode] ?? 0));
    start(async () => {
      const r = await saveHandwriting({ step, style, mode, score: g.score });
      if (r.ok && r.data) setBests((b) => ({ ...b, [mode]: r.data?.best ?? g.score }));
    });
  };
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={t("modes")} className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={at === s}
            data-mode={s}
            onClick={() => open(s)}
            className={tab(at === s)}
          >
            <strong>
              {i + 1} · {t(s)}
            </strong>
            <span className="text-sm text-muted-foreground">
              {t(`stepHelp.${s}`)}
              {s !== "watch" && bests[s] !== null && (
                <span className="ms-2 font-semibold" data-best={bests[s]}>
                  {t("best", { n: bests[s] ?? 0 })}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      <p className="text-muted-foreground">{t(`help.${at}`)}</p>
      {at === "watch" ? (
        <>
          <StrokeDemo key="watch" style={style} text={text} auto playLabel={t("watchAgain")} />
          <button type="button" data-go="trace" onClick={() => open("trace")} className={go}>
            {t("nowTrace")}
          </button>
        </>
      ) : (
        <>
          {at === "write" && (
            <div
              className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-3"
              data-example
            >
              <strong>{t("example")}</strong>
              <StrokeDemo style={style} text={text} maxH={96} playLabel={t("showMe")} />
            </div>
          )}
          <StrokePad
            key={at}
            style={style}
            text={text}
            mode={at}
            labels={{
              pad: t(at === "trace" ? "padTrace" : "padWrite", { text }),
              clear: t("clear"),
              undo: t("undo"),
              check: t("check"),
            }}
            onGrade={onGrade}
          />
          <div aria-live="polite" className="flex flex-col gap-3">
            {mark && <Result grade={mark} mode={at} isBest={isBest} />}
            {mark && mark.score >= PASS && at === "trace" && (
              <button type="button" data-go="write" onClick={() => open("write")} className={go}>
                {t("nowWrite")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
