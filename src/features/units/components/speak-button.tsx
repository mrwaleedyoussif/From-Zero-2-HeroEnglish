"use client";

import { Volume2 } from "lucide-react";
import { speak, voiceSpeed } from "../voice";

let current: HTMLAudioElement | null = null;

/** Play a recording, stopping whatever was playing; false when it cannot be played. */
export function playRecording(src: string, onEnd?: () => void, rate = voiceSpeed()): boolean {
  try {
    current?.pause();
    window.speechSynthesis?.cancel();
    current = new Audio(src);
    current.playbackRate = rate; // the browser keeps the voice's pitch
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
 * otherwise the device's own voice. `natural` (vocabulary) keeps the normal speed of speech.
 */
export function SpeakButton({
  text,
  label,
  src,
  natural,
}: {
  text: string;
  label: string;
  src?: string;
  natural?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={`${label}: ${text}`}
      title={label}
      data-recorded={src ? "" : undefined}
      onClick={() => {
        if (src && playRecording(src, undefined, natural ? 1 : undefined)) return;
        try {
          stopSound();
          speak(text, { natural });
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
