"use client";

import { useEffect } from "react";
import { touchPresence } from "../actions";

const EVERY = 60_000;

/** Tells the server this person is here, once a minute, only while the page is on screen. */
export function Heartbeat() {
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === "visible") void touchPresence().catch(() => undefined);
    };
    beat();
    const timer = setInterval(beat, EVERY);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);
  return null;
}
