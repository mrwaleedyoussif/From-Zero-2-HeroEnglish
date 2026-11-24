"use client";

import { Volume2 } from "lucide-react";

let current: HTMLAudioElement | null = null;

/** Play a recording, stopping whatever was playing; false when it cannot be played. */
export function playRecording(src: string, onEnd?: () => void): boolean {
  try {
    current?.pause();
    window.speechSynthesis?.cancel();
    current = new Audio(src);
    if (onEnd) current.onended = onEnd;
    void current.play().catch(() => onEnd?.());
    return true;
  } catch {
    return false;
  }
}

export function stopSound(): void {
  current?.pause();
  window.speechSynthesis?.cancel();
}

/**
 * Plays an English word or sentence: the recorded audio when the Owner has provided it,
 * otherwise the device's own voice.
 */
export function SpeakButton({ text, label, src }: { text: string; label: string; src?: string }) {
  return (
    <button
      type="button"
      aria-label={`${label}: ${text}`}
      title={label}
      data-recorded={src ? "" : undefined}
      onClick={() => {
        if (src && playRecording(src)) return;
        try {
          stopSound();
          const say = new SpeechSynthesisUtterance(text);
          say.lang = "en-GB";
          say.rate = 0.9;
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
