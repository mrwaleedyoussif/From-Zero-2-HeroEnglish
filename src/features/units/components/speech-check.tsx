"use client";

import { Mic, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useSyncExternalStore } from "react";
import { playCheer } from "@/features/rewards/sounds";
import { checkSpeech, type SpeechFeedback } from "../actions";

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type Ctor = new () => Recognition;
const engine = (): Ctor | null => {
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const never = () => () => {};

/**
 * "Say it": the browser listens, writes down the words it heard, and the server marks them
 * against the model (a shadowing chunk) or the task's targets. A practice guide, not a grade;
 * browsers without speech recognition get a note instead of a button.
 */
export function SpeechCheck({
  unitId,
  target,
  long = false,
  best,
}: {
  unitId: string;
  /** A chunk id, or "speaking" / "shadow" for a task's targets. */
  target: string;
  /** A task: keep listening until the learner presses Stop. */
  long?: boolean;
  best?: number;
}) {
  const t = useTranslations("Units");
  const supported = useSyncExternalStore(
    never,
    () => engine() !== null,
    () => true,
  );
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [result, setResult] = useState<SpeechFeedback | null>(null);
  const rec = useRef<Recognition | null>(null);
  const said = useRef("");

  const finish = async () => {
    setListening(false);
    setHeard(said.current);
    if (!said.current.trim()) return;
    const r = await checkSpeech(unitId, target, said.current);
    if (!r.ok || !r.data) return;
    setResult(r.data);
    playCheer(r.data.score >= 60 ? "good" : "tryAgain");
  };
  const start = () => {
    const Engine = engine();
    if (!Engine) return;
    said.current = "";
    setResult(null);
    const r = new Engine();
    r.lang = "en-US";
    r.continuous = long;
    r.interimResults = false;
    r.onresult = (e) => {
      said.current = Array.from(e.results, (x) => x[0]?.transcript ?? "").join(" ");
    };
    r.onend = () => void finish();
    r.onerror = () => setListening(false);
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };
  if (!supported) return <p className="text-sm text-muted-foreground">{t("speechUnsupported")}</p>;
  const score = result?.score;

  return (
    <div className="flex flex-col gap-2" data-speech={target}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={listening ? () => rec.current?.stop() : start}
          aria-pressed={listening}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#be123c] px-4 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {listening ? (
            <Square aria-hidden className="size-4" />
          ) : (
            <Mic aria-hidden className="size-4" />
          )}
          {listening ? t("speechStop") : t("speechStart")}
        </button>
        {(result ?? best !== undefined) && (
          <span className="unit-chip rounded-full px-3 py-1 text-sm font-bold" data-speech-best>
            {t("speechBest", { n: result?.best ?? best ?? 0 })}
          </span>
        )}
      </div>
      <div aria-live="polite">
        {listening && <p className="text-sm">{t("speechListening")}</p>}
        {!listening && heard && (
          <div
            className="unit-feedback rounded-xl px-3 py-2 text-sm"
            data-kind={score !== undefined && score >= 60 ? "right" : "hint"}
          >
            <p>
              <strong>{t("speechHeard")}</strong> <span dir="ltr">{heard}</span>
            </p>
            {score !== undefined && (
              <p className="font-semibold">
                {score >= 60 ? t("speechGood", { n: score }) : t("speechAgain", { n: score })}
              </p>
            )}
            {result?.usedWords && (
              <p>
                {t("speechUsed")}{" "}
                {[...result.usedWords, ...(result.usedStructures ?? [])].join(" · ") || "—"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
