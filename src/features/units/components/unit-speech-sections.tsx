import { Ear, Mic, Repeat2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Answered } from "../queries";
import type { Unit } from "../schema";
import { PlayScript } from "./play-script";
import { SpeakButton } from "./speak-button";
import { SpeechCheck } from "./speech-check";
import { Bi, UnitPanel } from "./unit-panel";
import type { Audio } from "./unit-sections";

const pad = (n: number) => String(n).padStart(2, "0");

/** Listening: hear the script first; the written script stays folded until asked for. */
export async function UnitScript({
  script,
  unitId,
  audio,
}: {
  script: NonNullable<Unit["script"]>;
  unitId: string;
  audio: Audio;
}) {
  const t = await getTranslations("Units");
  // Line recordings are numbered in order: <unit>-LIN01, -LIN02, …
  const lines = script.lines.map((l, i) => ({ ...l, src: audio[`${unitId}-LIN${pad(i + 1)}`] }));
  return (
    <UnitPanel hue="blue" icon={Ear} title={script.title} part="script">
      {script.setting && <p className="text-muted-foreground">{script.setting}</p>}
      <PlayScript
        src={audio[script.id]}
        lines={lines}
        labels={{ play: t("playAll"), stop: t("stop") }}
      />
      <details>
        <summary className="cursor-pointer font-semibold">{t("showScript")}</summary>
        <ol dir="ltr" className="mt-3 flex flex-col gap-2 text-start">
          {lines.map((line, i) => (
            <li key={`${i}-${line.text}`} className="flex items-start gap-2">
              <SpeakButton text={line.text} label={t("listen")} src={line.src} />
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
export async function UnitSpeaking({
  task,
  unitId,
  best,
}: {
  task: NonNullable<Unit["speaking_task"]>;
  unitId: string;
  best?: number;
}) {
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
      {task.targets && <SpeechCheck unitId={unitId} target="speaking" long best={best} />}
    </UnitPanel>
  );
}

/** Shadowing: hear each short piece, then say it with the same stress (CAPITALS) and tune. */
export async function UnitShadow({
  model,
  unitId,
  audio,
  answers,
}: {
  model: NonNullable<Unit["model_text"]>;
  unitId: string;
  audio: Audio;
  answers: Record<string, Answered>;
}) {
  const t = await getTranslations("Units");
  return (
    <UnitPanel hue="violet" icon={Repeat2} title={model.title} part="shadow">
      <p className="text-muted-foreground">{t("shadowHelp")}</p>
      <PlayScript
        rate={0.8}
        src={audio[`${unitId}-SPD01`]}
        lines={model.chunks.map((c) => ({ text: c.text, src: audio[c.id] }))}
        labels={{ play: t("playAll"), stop: t("stop") }}
      />
      <ol dir="ltr" className="flex flex-col gap-3 text-start">
        {model.chunks.map((c) => (
          <li
            key={c.id}
            data-chunk={c.id}
            className="flex items-start gap-3 rounded-xl border border-border bg-background p-3"
          >
            <SpeakButton text={c.text} label={t("listen")} src={audio[c.id]} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-lg font-medium">
                {c.display ?? c.text}{" "}
                {c.intonation && (
                  <span className="unit-chip rounded-full px-2">{c.intonation}</span>
                )}
              </p>
              {c.linking && <p className="text-sm text-muted-foreground">{c.linking}</p>}
              <SpeechCheck unitId={unitId} target={c.id} best={answers[`speech:${c.id}`]?.score} />
            </div>
          </li>
        ))}
      </ol>
    </UnitPanel>
  );
}
