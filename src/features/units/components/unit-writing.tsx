"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveWriting } from "../actions";

/** The writing task: a box that counts words against the target, saved for the learner. */
export function UnitWriting({
  unitId,
  initial,
  range,
}: {
  unitId: string;
  initial: string;
  range?: [number, number];
}) {
  const t = useTranslations("Units");
  const [text, setText] = useState(initial);
  const [model, setModel] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const inRange = !range || (words >= range[0] && words <= range[1]);

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        dir="ltr"
        maxLength={6000}
        aria-label={t("yourWriting")}
        placeholder={t("yourWriting")}
        className="w-full rounded-xl border-2 border-border bg-background p-3 leading-relaxed outline-none focus-visible:border-ring"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          data-words={words}
          className={`unit-chip rounded-full px-3 py-1 text-sm font-semibold ${inRange ? "" : "opacity-80"}`}
        >
          {range
            ? t("wordsOf", { n: words, min: range[0], max: range[1] })
            : t("wordsCount", { n: words })}
        </p>
        <Button
          disabled={pending || !text.trim()}
          onClick={() =>
            start(async () => {
              const r = await saveWriting(unitId, text);
              if (!r.ok) return void toast.error(t("notSaved"));
              toast.success(t("saved"));
              setModel(r.data?.model ?? null);
            })
          }
        >
          {t("saveWriting")}
        </Button>
      </div>
      {model && (
        <details open className="unit-feedback rounded-xl px-3 py-2" data-kind="answer">
          <summary className="cursor-pointer font-semibold">{t("modelAnswer")}</summary>
          <p className="mt-2 whitespace-pre-line">{model}</p>
        </details>
      )}
    </div>
  );
}
