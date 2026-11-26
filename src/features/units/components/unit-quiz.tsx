import { ClipboardCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import type { Answered } from "../queries";
import { triesAllowed, type Unit } from "../schema";
import { PlayScript } from "./play-script";
import { UnitQuestions } from "./unit-sections";
import type { Audio } from "./unit-sections";

/**
 * A STEP lesson quiz: one Submit for all its questions. Each reading text or recording comes
 * just before its questions; a recording's script appears only once the quiz is finished.
 */
export async function UnitQuiz({
  unit,
  answers,
  audio,
}: {
  unit: Unit;
  answers: Record<string, Answered>;
  audio: Audio;
}) {
  const t = await getTranslations("Units");
  const all = unit.quiz.flatMap((g) => g.questions);
  if (all.length === 0) return null;
  const finished = all.every((q) => {
    const a = answers[q.id];
    return a && (a.correct !== false || a.tries >= triesAllowed(q));
  });
  const before: Record<string, ReactNode> = {};
  let part: string | undefined;
  for (const g of unit.quiz) {
    const first = g.questions[0];
    if (!first) continue;
    const blocks: ReactNode[] = [];
    if (first.part && first.part !== part) {
      part = first.part;
      blocks.push(
        <h3 key="part" className="unit-chip rounded-xl px-3 py-2 font-bold">
          {part}
        </h3>,
      );
    }
    if (g.text || g.track)
      blocks.push(
        <div
          key="group"
          data-group={g.id}
          className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4"
        >
          {g.title && <h3 className="font-bold">{g.title}</h3>}
          {g.text && (
            <div dir="ltr" className="unit-passage flex flex-col gap-2 text-start text-lg">
              {g.text.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
          {g.track && (
            <PlayScript
              src={audio[g.track]}
              lines={(g.script ?? []).map((l) => ({ speaker: l.speaker, text: l.text }))}
              labels={{ play: t("playRecording"), stop: t("stop") }}
            />
          )}
          {g.track && finished && g.script && (
            <details>
              <summary className="cursor-pointer font-semibold">{t("showScript")}</summary>
              <ol dir="ltr" className="mt-2 flex flex-col gap-1 text-start">
                {g.script.map((l, i) => (
                  <li key={i}>
                    <strong>{l.speaker}:</strong> {l.text}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>,
      );
    if (blocks.length) before[first.id] = <>{blocks}</>;
  }
  return (
    <UnitQuestions
      unitId={unit.id}
      set="quiz"
      title={t("quiz", { n: all.length })}
      part="quiz"
      hue="rose"
      icon={ClipboardCheck}
      questions={all}
      answers={answers}
      before={before}
    />
  );
}
