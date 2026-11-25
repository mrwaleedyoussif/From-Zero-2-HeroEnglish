import { BookOpenText, HelpCircle, type LucideIcon, Sigma } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Hue } from "@/features/departments/catalog";
import type { Answered } from "../queries";
import { publicQuestion, type Question, shownAnswer, triesAllowed, type Unit } from "../schema";
import { PlayScript } from "./play-script";
import { SpeakButton } from "./speak-button";
import { Bi, UnitPanel } from "./unit-panel";
import { UnitQuestion } from "./unit-question";

/** Recorded audio by item id (see loadUnit). */
export type Audio = Record<string, string>;

/** "a **key** word" → the key word in bold. */
function Marked({ text }: { text: string }) {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>));
}

/** A text to read (and hear): a reading passage or a grammar text in context. */
export async function UnitText({
  text,
  part,
  audio,
}: {
  text: { id: string; title: string; paragraphs: string[] };
  part: string;
  audio: Audio;
}) {
  const t = await getTranslations("Units");
  return (
    <UnitPanel hue="green" icon={BookOpenText} title={text.title} part={part}>
      {audio[text.id] && (
        <PlayScript
          src={audio[text.id]}
          lines={[]}
          labels={{ play: t("playAll"), stop: t("stop") }}
        />
      )}
      <div dir="ltr" className="unit-passage flex flex-col gap-3 text-start text-lg">
        {text.paragraphs.map((p, i) => (
          <div key={p} className="flex items-start gap-2">
            <SpeakButton text={p.replaceAll("**", "")} label={t("listenPara", { n: i + 1 })} />
            <p>
              <Marked text={p} />
            </p>
          </div>
        ))}
      </div>
    </UnitPanel>
  );
}

/** A set of questions, each checked on the server; finished ones show their answer again. */
export function UnitQuestions({
  unitId,
  title,
  part,
  questions,
  answers,
  from = 1,
  hue = "rose",
  icon = HelpCircle,
}: {
  unitId: string;
  title: string;
  part: string;
  questions: Question[];
  answers: Record<string, Answered>;
  /** Number of the first question (numbering runs on across a unit's sets). */
  from?: number;
  hue?: Hue;
  icon?: LucideIcon;
}) {
  if (questions.length === 0) return null;
  return (
    <UnitPanel hue={hue} icon={icon} title={title} part={part}>
      <ol className="flex flex-col gap-6">
        {questions.map((q, i) => {
          const a = answers[q.id];
          const settled = a && (a.correct !== false || a.tries >= triesAllowed(q));
          return (
            <UnitQuestion
              key={q.id}
              unitId={unitId}
              number={from + i}
              q={publicQuestion(q)}
              settled={
                settled
                  ? {
                      choice: a.choice,
                      correct: a.correct,
                      answer: shownAnswer(q),
                      explanation: q.explanation,
                    }
                  : undefined
              }
            />
          );
        })}
      </ol>
    </UnitPanel>
  );
}

/** Language Usage: notice, the rule, examples; the controlled questions follow as their own set. */
export async function UnitGrammar({ lesson }: { lesson: NonNullable<Unit["grammar_lesson"]> }) {
  const t = await getTranslations("Units");
  return (
    <UnitPanel hue="teal" icon={Sigma} title={lesson.name.en} part="grammar">
      {lesson.noticing && <Bi en={lesson.noticing.en} ar={lesson.noticing.ar} />}
      <div className="unit-chip rounded-xl p-3">
        <strong>{t("rule")}</strong>
        <Bi en={lesson.rule.en} ar={lesson.rule.ar} />
      </div>
      <ul dir="ltr" className="flex flex-col gap-2 text-start">
        {lesson.examples.map((e) => (
          <li key={e} className="flex items-center gap-2">
            <SpeakButton text={e} label={t("listen")} />
            {e}
          </li>
        ))}
      </ul>
    </UnitPanel>
  );
}
