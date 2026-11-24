"use client";

import { Play, Square } from "lucide-react";
import { useState } from "react";

/**
 * Plays a script aloud with the device's own voices, one line after another, each speaker at
 * a different pitch (there are no recorded audio files yet). `rate` slows it for shadowing.
 */
export function PlayScript({
  lines,
  labels,
  rate = 0.9,
}: {
  lines: { speaker?: string; text: string }[];
  labels: { play: string; stop: string };
  rate?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const stop = () => {
    window.speechSynthesis?.cancel();
    setPlaying(false);
  };
  const play = () => {
    try {
      const speakers = [...new Set(lines.map((l) => l.speaker ?? ""))];
      window.speechSynthesis.cancel();
      lines.forEach((line, i) => {
        const say = new SpeechSynthesisUtterance(line.text);
        say.lang = "en-GB";
        say.rate = rate;
        say.pitch = 0.8 + 0.35 * speakers.indexOf(line.speaker ?? "");
        if (i === lines.length - 1) say.onend = () => setPlaying(false);
        window.speechSynthesis.speak(say);
      });
      setPlaying(true);
    } catch {
      // no speech on this device: the written script is still there
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
