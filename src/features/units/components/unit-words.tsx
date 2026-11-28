import { Languages } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Answered } from "../queries";
import type { Unit } from "../schema";
import { SpeakButton } from "./speak-button";
import { SpeechCheck } from "./speech-check";
import { Bi, UnitPanel } from "./unit-panel";
import type { Audio } from "./unit-sections";

/**
 * Words to know: each word with its picture (when there is one), sound, meaning and Arabic,
 * and a "Say it" button to repeat it after the speaker and hear how it went.
 */
export async function UnitWords({
  unit,
  audio,
  images,
  answers,
}: {
  unit: Unit;
  audio: Audio;
  images: Audio;
  answers: Record<string, Answered>;
}) {
  const t = await getTranslations("Units");
  return (
    <UnitPanel hue="violet" icon={Languages} title={t("words")} part="words">
      <p className="text-sm text-muted-foreground">{t("wordsHelp")}</p>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {unit.vocabulary.map((w) => (
          <li
            key={w.id}
            data-word={w.id}
            className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3"
          >
            <div className="flex gap-3">
              {images[w.id] && (
                // eslint-disable-next-line @next/next/no-img-element -- private media proxy
                <img
                  src={images[w.id]}
                  alt={w.word}
                  loading="lazy"
                  className="size-20 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SpeakButton text={w.word} label={t("listen")} src={audio[w.id]} natural />
                  <strong className="text-lg">{w.word}</strong>
                  {w.pos && <span className="unit-chip rounded-full px-2 text-xs">{w.pos}</span>}
                </div>
                {(w.ipa || w.syllables) && (
                  <span dir="ltr" className="text-sm text-muted-foreground">
                    {[w.ipa, w.syllables, w.stress].filter(Boolean).join("  ")}
                  </span>
                )}
                <Bi en={w.definition} ar={w.arabic} />
              </div>
            </div>
            {w.example && <em className="text-sm">“{w.example}”</em>}
            <SpeechCheck
              quiet
              unitId={unit.id}
              target={w.id}
              best={answers[`speech:${w.id}`]?.score}
            />
          </li>
        ))}
      </ul>
    </UnitPanel>
  );
}
