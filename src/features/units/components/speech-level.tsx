"use client";

import { useEffect } from "react";
import { setSpeechLevel } from "../voice";

/** Tells the Listen buttons on this page which level they speak for. Draws nothing. */
export function SpeechLevel({ level }: { level: string }) {
  useEffect(() => {
    setSpeechLevel(level);
    // Voices load late on some browsers: asking early has them ready for the first press.
    window.speechSynthesis?.getVoices();
    return () => setSpeechLevel(undefined);
  }, [level]);
  return null;
}
