"use client";

import { Play, Square } from "lucide-react";
import { useState } from "react";
import { playRecording, stopSound } from "./speak-button";

/**
 * Plays a whole script: the full recording when there is one (`src`), else each line's
 * recording in turn, else the device's voices (each speaker at a different pitch).
 * `rate` slows the device voice for shadowing.
 */
export function PlayScript({
  lines,
  labels,
  src,
  rate = 0.9,
}: {
  lines: { speaker?: string; text: string; src?: string }[];
  labels: { play: string; stop: string };
  src?: string;
  rate?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const stop = () => {
    stopSound();
    setPlaying(false);
  };
  const play = () => {
    const end = () => setPlaying(false);
    setPlaying(true);
    if (src && playRecording(src, end)) return;
    if (lines.every((l) => l.src)) {
      const next = (i: number) => {
        const line = lines[i];
        if (!line?.src) return end();
        playRecording(line.src, () => next(i + 1));
      };
      return next(0);
    }
    try {
      const speakers = [...new Set(lines.map((l) => l.speaker ?? ""))];
      stopSound();
      lines.forEach((line, i) => {
        const say = new SpeechSynthesisUtterance(line.text);
        say.lang = "en-GB";
        say.rate = rate;
        say.pitch = 0.8 + 0.35 * speakers.indexOf(line.speaker ?? "");
        if (i === lines.length - 1) say.onend = end;
        window.speechSynthesis.speak(say);
      });
    } catch {
      end(); // no speech on this device: the written script is still there
    }
  };
  return (
    <button
      type="button"
      onClick={playing ? stop : play}
      aria-pressed={playing}
      className="unit-chip inline-flex min-h-11 items-center gap-2 self-start rounded-full px-5 font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {playing ? (
        <Square aria-hidden className="size-4" />
      ) : (
        <Play aria-hidden className="size-4" />
      )}
      {playing ? labels.stop : labels.play}
    </button>
  );
}
