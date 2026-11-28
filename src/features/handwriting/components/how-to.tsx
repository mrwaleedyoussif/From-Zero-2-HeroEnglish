import { useTranslations } from "next-intl";
import type { Style } from "../types";
import { StrokeDemo } from "./stroke-demo";

/**
 * "How to learn here": the app writing a word again and again (start dots, arrows, the pen's
 * tip) beside the four things to do. It plays by itself and needs no sound.
 */
export function HowTo({ style, sample }: { style: Style; sample: string }) {
  const t = useTranslations("Handwriting");
  return (
    <details open data-how-to className="rounded-2xl border border-border bg-card p-4">
      <summary className="cursor-pointer text-lg font-bold">{t("howTitle")}</summary>
      <div className="mt-3 grid items-center gap-4 md:grid-cols-2">
        <StrokeDemo style={style} text={sample} maxH={150} auto loop />
        <ol className="flex list-decimal flex-col gap-2 ps-5">
          {(["watch", "trace", "write", "check"] as const).map((k) => (
            <li key={k}>{t(`how.${k}`)}</li>
          ))}
        </ol>
      </div>
    </details>
  );
}
