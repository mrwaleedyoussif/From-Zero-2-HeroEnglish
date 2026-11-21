"use client";

import { useEffect, useRef, useState } from "react";

/** A visible timer: counts down `seconds` from mount, or to an `until` timestamp. */
export function Countdown({
  seconds,
  until,
  label,
  onDone,
}: {
  seconds?: number;
  until?: string;
  label: string;
  onDone: () => void;
}) {
  const [end] = useState(() =>
    until ? new Date(until).getTime() : Date.now() + (seconds ?? 0) * 1000,
  );
  const [left, setLeft] = useState(() => Math.max(0, Math.round((end - Date.now()) / 1000)));
  const fired = useRef(false);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0 && !fired.current) {
        fired.current = true;
        done.current();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [end]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <span className={left <= 10 ? "font-semibold text-destructive" : undefined}>
      {label}{" "}
      <time dir="ltr" aria-live={left <= 10 ? "polite" : "off"}>
        {mm}:{ss}
      </time>
    </span>
  );
}
