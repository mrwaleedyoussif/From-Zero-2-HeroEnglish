"use client";

import { useTranslations } from "next-intl";
import type { WritingFeedback } from "../writing-feedback";

/** Feedback on the writing task: one card for each of the seven criteria, with a score of 4. */
export function WritingResult({ feedback }: { feedback: WritingFeedback }) {
  const t = useTranslations("Units");
  return (
    <section
      aria-label={t("writingFeedback")}
      data-writing-feedback={feedback.source}
      className="flex flex-col gap-3"
    >
      <h3 className="font-bold">{t("writingFeedback")}</h3>
      {feedback.summary && (
        <p className="unit-feedback rounded-xl px-3 py-2" data-kind="right">
          {feedback.summary.en}
          <span lang="ar" dir="rtl" className="block text-sm">
            {feedback.summary.ar}
          </span>
        </p>
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {feedback.notes.map((n) => (
          <li
            key={n.key}
            data-criterion={n.key}
            className="flex flex-col gap-1 rounded-xl border border-border bg-background p-3 text-sm"
          >
            <p className="flex items-center justify-between gap-2 font-bold">
              {t(`wcrit.${n.key}`)}
              <span className="unit-chip rounded-full px-2 text-xs" data-score={n.score ?? ""}>
                {n.score === null ? "—" : t("outOf4", { n: n.score })}
              </span>
            </p>
            {n.en ? (
              <p>
                {n.en}
                <span lang="ar" dir="rtl" className="block text-muted-foreground">
                  {n.ar}
                </span>
              </p>
            ) : (
              <p>
                {t(`wf.${n.code ?? "needsReader"}`, {
                  n: n.n ?? 0,
                  min: n.min ?? 0,
                  max: n.max ?? 0,
                })}{" "}
                {n.key === "punctuation"
                  ? n.list?.map((slip) => t(`slip.${slip}`)).join(" ")
                  : n.list && n.list.length > 0 && <strong dir="ltr">{n.list.join(" · ")}</strong>}
              </p>
            )}
            {n.fixes?.map((f) => (
              <p key={f.wrong} dir="ltr" className="text-start">
                <s className="opacity-80">{f.wrong}</s> → <strong>{f.right}</strong>
              </p>
            ))}
          </li>
        ))}
      </ul>
      {feedback.source === "rules" && (
        <p className="text-xs text-muted-foreground">{t("writingRulesNote")}</p>
      )}
    </section>
  );
}
