import { BookOpenText, Ear, HelpCircle, type LucideIcon, Mic, Repeat2, Sigma } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Hue } from "@/features/departments/catalog";
import type { Answered } from "../queries";
import { publicQuestion, type Question, shownAnswer, triesAllowed, type Unit } from "../schema";
import { PlayScript } from "./play-script";
import { SpeakButton } from "./speak-button";
import { Bi, UnitPanel } from "./unit-panel";
import { UnitQuestion } from "./unit-question";

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
}: {
  text: { title: string; paragraphs: string[] };
  part: string;
}) {
  const t = await getTranslations("Units");
  return (
    <UnitPanel hue="green" icon={BookOpenText} title={text.title} part={part}>
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

/** Listening: hear the script first; the written script stays folded until asked for. */
export async function UnitScript({ script }: { script: NonNullable<Unit["script"]> }) {
  const t = await getTranslations("Units");
  return (
    <UnitPanel hue="blue" icon={Ear} title={script.title} part="script">
      {script.setting && <p className="text-muted-foreground">{script.setting}</p>}
      <PlayScript lines={script.lines} labels={{ play: t("playAll"), stop: t("stop") }} />
      <details>
        <summary className="cursor-pointer font-semibold">{t("showScript")}</summary>
        <ol dir="ltr" className="mt-3 flex flex-col gap-2 text-start">
          {script.lines.map((line, i) => (
            <li key={`${i}-${line.text}`} className="flex items-start gap-2">
              <SpeakButton text={line.text} label={t("listen")} />
              <p>
                <strong>{line.speaker}:</strong> {line.text}
              </p>
            </li>
          ))}
        </ol>
      </details>
    </UnitPanel>
  );
}

/** Speaking: the task, what to cover, useful phrases and the time to prepare and speak. */
export async function UnitSpeaking({ task }: { task: NonNullable<Unit["speaking_task"]> }) {
  const t = await getTranslations("Units");
  return (
    <UnitPanel hue="orange" icon={Mic} title={t("speakingTask")} part="speaking">
      <Bi en={task.prompt.en} ar={task.prompt.ar} />
      {(task.prep_time_s || task.speak_time_s) && (
        <p className="unit-chip self-start rounded-full px-3 py-1 text-sm font-semibold">
          {t("speakingTime", { prep: task.prep_time_s ?? 0, speak: task.speak_time_s ?? 0 })}
        </p>
      )}
      {task.points.length > 0 && (
        <ul className="flex list-disc flex-col gap-1 ps-5">
          {task.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <ul dir="ltr" className="flex flex-col gap-2">
        {task.frames.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <SpeakButton text={f.replace(/\.{2,}|_+/g, " ")} label={t("listen")} />
            <span className="unit-chip rounded-full px-3 py-1 text-sm">{f}</span>
          </li>
        ))}
      </ul>
    </UnitPanel>
  );
}

/** Shadowing: hear each short piece, then say it with the same stress (CAPITALS) and tune. */
export async function UnitShadow({ model }: { model: NonNullable<Unit["model_text"]> }) {
  const t = await getTranslations("Units");
  return (
    <UnitPanel hue="violet" icon={Repeat2} title={model.title} part="shadow">
      <p className="text-muted-foreground">{t("shadowHelp")}</p>
      <PlayScript
        rate={0.8}
        lines={model.chunks.map((c) => ({ text: c.text }))}
        labels={{ play: t("playAll"), stop: t("stop") }}
      />
      <ol dir="ltr" className="flex flex-col gap-3 text-start">
        {model.chunks.map((c) => (
          <li
            key={c.id}
            data-chunk={c.id}
            className="flex items-start gap-3 rounded-xl border border-border bg-background p-3"
          >
            <SpeakButton text={c.text} label={t("listen")} />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-lg font-medium">
                {c.display ?? c.text}{" "}
                {c.intonation && (
                  <span className="unit-chip rounded-full px-2">{c.intonation}</span>
                )}
              </p>
              {c.linking && <p className="text-sm text-muted-foreground">{c.linking}</p>}
            </div>
          </li>
        ))}
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
