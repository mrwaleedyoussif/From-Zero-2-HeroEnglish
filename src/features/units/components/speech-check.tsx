"use client";

import { Mic, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useSyncExternalStore } from "react";
import { playCheer } from "@/features/rewards/sounds";
import { analyse } from "../prosody";
import { checkSpeech, type SpeechFeedback } from "../speech-actions";
import { SpeechResult } from "./speech-result";
import { type Capture, startCapture } from "./voice-capture";

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence?: number }>> }) => void)
    | null;
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
 * "Say it": the browser listens, writes down the words it heard and (on computers) records the
 * voice to measure stress and tune. The server marks it against the model: a shadowing chunk,
 * a word, or a task's targets. A practice guide, not a grade; browsers without speech
 * recognition get a note instead of a button.
 */
export function SpeechCheck({
  unitId,
  target,
  long = false,
  best,
  quiet,
}: {
  unitId: string;
  /** A chunk or word id, or "speaking" / "shadow" for a task's targets. */
  target: string;
  /** A task: keep listening until the learner presses Stop. */
  long?: boolean;
  best?: number;
  /** Show nothing (not a note) where the browser cannot listen: used once per word. */
  quiet?: boolean;
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
  const sure = useRef<number | undefined>(undefined);
  const capture = useRef<Promise<Capture | null> | null>(null);
  const [recording, setRecording] = useState<string | null>(null);

  const finish = async () => {
    setListening(false);
    const voice = await (await capture.current)?.stop();
    capture.current = null;
    setRecording(voice?.url ?? null);
    setHeard(said.current);
    if (!said.current.trim() && !voice?.url) return;
    const measured = voice ? analyse(voice.frames) : null;
    const r = await checkSpeech(unitId, target, said.current, measured, sure.current);
    if (!r.ok || !r.data) return;
    setResult(r.data);
    playCheer(r.data.score >= 60 ? "good" : "tryAgain");
  };
  const start = () => {
    const Engine = engine();
    if (!Engine) return;
    said.current = "";
    sure.current = undefined;
    setResult(null);
    setHeard("");
    setRecording(null);
    capture.current = startCapture();
    const r = new Engine();
    r.lang = "en-US";
    r.continuous = long;
    r.interimResults = false;
    r.onresult = (e) => {
      const best = Array.from(e.results, (x) => x[0]);
      said.current = best.map((x) => x?.transcript ?? "").join(" ");
      const known = best.flatMap((x) => (x?.confidence ? [x.confidence] : []));
      if (known.length) sure.current = known.reduce((a, b) => a + b, 0) / known.length;
    };
    r.onend = () => void finish();
    r.onerror = () => setListening(false); // onend follows and finishes
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };
  if (!supported && quiet) return null;
  if (!supported) return <p className="text-sm text-muted-foreground">{t("speechUnsupported")}</p>;

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
        {!listening && (heard || recording) && (
          <SpeechResult heard={heard} result={result} recording={recording} />
        )}
      </div>
    </div>
  );
}
