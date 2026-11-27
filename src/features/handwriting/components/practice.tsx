"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { saveHandwriting } from "../actions";
import type { Mode, Stage } from "../pad-draw";
import { type Mark, starsOf } from "../score";
import { WritingPad } from "./writing-pad";

const tab = (on: boolean) =>
  `min-h-11 rounded-full border-2 px-4 font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`;

/** One step: trace it, then write it without the letters underneath; each try is marked. */
export function Practice({
  step,
  style,
  family,
  stage,
  text,
  best,
}: {
  step: string;
  style: string;
  family: string;
  stage: Stage;
  text: string;
  best: { trace: number | null; write: number | null };
}) {
  const t = useTranslations("Handwriting");
  const [mode, setMode] = useState<Mode>("trace");
  const [mark, setMark] = useState<Mark | null>(null);
  const [bests, setBests] = useState(best);
  const [, start] = useTransition();
  const onMark = (m: Mark) => {
    setMark(m);
    if (m.codes.includes("empty")) return;
    start(async () => {
      const r = await saveHandwriting({ step, style, mode, score: m.score });
      if (r.ok && r.data) setBests((b) => ({ ...b, [mode]: r.data?.best ?? m.score }));
    });
  };
  const stars = mark ? starsOf(mark.score) : 0;
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={t("modes")} className="flex flex-wrap gap-2">
        {(["trace", "write"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            data-mode={m}
            onClick={() => {
              setMode(m);
              setMark(null);
            }}
            className={tab(mode === m)}
          >
            {t(m)}
            {bests[m] !== null && (
              <span className="ms-2 text-sm font-normal" data-best={bests[m]}>
                {t("best", { n: bests[m] ?? 0 })}
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground">{t(mode === "trace" ? "traceHelp" : "writeHelp")}</p>
      <WritingPad
        key={mode}
        text={text}
        family={family}
        stage={stage}
        mode={mode}
        onMark={onMark}
      />
      <div aria-live="polite">
        {mark && (
          <div
            data-mark={mark.score}
            className={`flex flex-col gap-2 rounded-2xl border-2 p-4 ${stars >= 2 ? "border-success bg-success/10" : "border-amber-400 bg-amber-50 dark:bg-amber-950/30"}`}
          >
            <p className="text-lg font-bold">
              <span aria-hidden>{"⭐".repeat(stars)} </span>
              {mark.codes.includes("empty") ? t("tip.empty") : t("score", { n: mark.score })}
            </p>
            {!mark.codes.includes("empty") && (
              <>
                <ul className="flex flex-wrap gap-2 text-sm">
                  {(
                    [
                      ["shape", mark.shape],
                      ["size", mark.size],
                      ["line", mark.line],
                    ] as const
                  ).map(
                    ([k, v]) =>
                      v !== null && (
                        <li
                          key={k}
                          data-criterion={k}
                          className="rounded-full bg-background px-3 py-1"
                        >
                          <strong>{t(`crit.${k}`)}</strong> {v}%
                        </li>
                      ),
                  )}
                </ul>
                <ul className="flex flex-col gap-1">
                  {mark.codes.map((c) => (
                    <li key={c} data-tip={c}>
                      {c === "good" ? "✓" : "→"} {t(`tip.${c}`)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
