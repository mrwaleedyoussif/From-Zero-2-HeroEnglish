"use client";

import { Gauge } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { setVoiceSpeed, SPEEDS, voiceSpeed, watchVoiceSpeed } from "../voice";

/**
 * How fast the model voice speaks: the learner's own choice, for recordings and the device
 * voice alike. Kept on the device, so it is the same on every unit.
 */
export function VoiceSpeed({ label, names }: { label: string; names: Record<string, string> }) {
  const speed = useSyncExternalStore(watchVoiceSpeed, voiceSpeed, () => 1);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("voiceSpeed"));
      if (saved) setVoiceSpeed(saved, false);
    } catch {
      // no storage here: normal speed
    }
  }, []);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-voice-speed={speed}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <Gauge aria-hidden className="size-4" />
        {label}
      </span>
      {SPEEDS.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={speed === s}
          data-speed={s}
          onClick={() => setVoiceSpeed(s)}
          className={`min-h-10 rounded-full border-2 px-3 text-sm font-semibold ${speed === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
        >
          {names[String(s)]}
        </button>
      ))}
    </div>
  );
}
