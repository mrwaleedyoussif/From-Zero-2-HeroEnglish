"use client";

import { useTranslations } from "next-intl";
import type { SpeechFeedback } from "../speech-actions";

/** Feedback after speaking: what was heard, then one line for each thing that was checked. */
export function SpeechResult({
  heard,
  result,
  recording,
}: {
  heard: string;
  result: SpeechFeedback | null;
  /** The learner's own recording, to compare with the speaker. */
  recording: string | null;
}) {
  const t = useTranslations("Units");
  const good = (result?.score ?? 0) >= 60;
  return (
    <div
      className="unit-feedback flex flex-col gap-2 rounded-xl px-3 py-2 text-sm"
      data-kind={good ? "right" : "hint"}
    >
      <p>
        <strong>{t("speechHeard")}</strong> <span dir="ltr">{heard || "—"}</span>
      </p>
      {result?.marks && (
        <p data-word-marks>
          <strong>{t("speechWords")}</strong>{" "}
          <span dir="ltr" className="inline-flex flex-wrap gap-1">
            {result.marks.map((m, i) => (
              <span
                key={i}
                data-word={m.ok ? "right" : "wrong"}
                className={
                  m.ok
                    ? "rounded bg-success/15 px-1 font-semibold text-success"
                    : "rounded bg-destructive/15 px-1 font-semibold text-destructive underline decoration-wavy"
                }
              >
                {m.ok ? "✓" : "✗"} {m.text}
              </span>
            ))}
          </span>
        </p>
      )}
      {result?.extra && result.extra.length > 0 && (
        <p data-word-extra>
          <strong>{t("speechExtra")}</strong> <span dir="ltr">{result.extra.join(" · ")}</span>
        </p>
      )}
      {recording && (
        <audio
          controls
          src={recording}
          aria-label={t("speechMine")}
          className="h-9 w-full max-w-xs"
        />
      )}
      {result && (
        <>
          <p className="font-semibold">
            {good ? t("speechGood", { n: result.score }) : t("speechAgain", { n: result.score })}
          </p>
          <ul className="flex flex-col gap-1.5" data-criteria>
            {result.criteria.map((c) => (
              <li
                key={c.key}
                data-criterion={c.key}
                className="flex flex-wrap items-baseline gap-x-2"
              >
                <strong>{t(`crit.${c.key}`)}</strong>
                <span className="rounded-full bg-white/70 px-2 text-xs font-bold">
                  {c.score === null ? "—" : `${c.score}%`}
                </span>
                <span className="basis-full">
                  {t(`sp.${c.code}`, { n: c.n ?? 0, got: c.got ?? 0 })}{" "}
                  {c.list && c.list.length > 0 && <strong dir="ltr">{c.list.join(" · ")}</strong>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
