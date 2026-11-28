"use client";

import { Play, Square } from "lucide-react";
import { useState } from "react";
import { speak } from "../voice";
import { playRecording, stopSound } from "./speak-button";

/**
 * Plays a whole script: the full recording when there is one (`src`), else each line's
 * recording in turn, else the device's voices (a different voice for each speaker where the
 * device has them), at the unit's level. `slow` slows the device voice a little for shadowing.
 */
export function PlayScript({
  lines,
  labels,
  src,
  slow,
}: {
  lines: { speaker?: string; text: string; src?: string }[];
  labels: { play: string; stop: string };
  src?: string;
  slow?: boolean;
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
      lines.forEach((line, i) =>
        speak(line.text, {
          speaker: speakers.indexOf(line.speaker ?? ""),
          slow,
          onEnd: i === lines.length - 1 ? end : undefined,
        }),
      );
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
