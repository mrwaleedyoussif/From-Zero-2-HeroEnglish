"use client";

import { Volume2 } from "lucide-react";

/** Says an English word or sentence aloud with the device's own voice (no audio file needed). */
export function SpeakButton({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={`${label}: ${text}`}
      title={label}
      onClick={() => {
        try {
          const say = new SpeechSynthesisUtterance(text);
          say.lang = "en-GB";
          say.rate = 0.9;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(say);
        } catch {
          // no speech on this device: the written word is still there
        }
      }}
      className="unit-chip inline-flex size-9 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Volume2 aria-hidden className="size-4" />
    </button>
  );
}
