"use client";

import { Play } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { drawDirections, drawLines, drawModel, drawWriting, setup } from "../strokes/draw";
import type { Placed } from "../strokes/place";
import type { Style } from "../types";
import { usePlaced } from "./use-placed";

/** Points a second: a letter takes about two seconds, a word about five, a paragraph under a minute. */
export const paceOf = (P: Placed) =>
  Math.max(55, Math.min(Math.max(150, P.pts.length / 40), P.pts.length / 4.5));

/**
 * The app writes the text: a red pen tip follows each stroke in order, with a green dot where
 * each stroke starts and arrows for the way to go. `still` shows the finished writing only.
 */
export function StrokeDemo({
  style,
  text,
  maxH,
  auto,
  loop,
  still,
  playLabel,
}: {
  style: Style;
  text: string;
  maxH?: number;
  /** Start writing as soon as it is shown. */
  auto?: boolean;
  loop?: boolean;
  still?: boolean;
  /** Shows a button with this label that writes it again. */
  playLabel?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const P = usePlaced(box, style, text, maxH);

  const frame = useCallback(
    (n: number) => {
      if (!P || !cv.current) return;
      const c = setup(cv.current, P.w, P.h);
      drawLines(c, P.rows, P.w);
      if (still) return drawModel(c, P, "#2E3074", Math.max(1.6, 26 * P.s));
      drawModel(c, P, "#E6EAF3", Math.max(3, 30 * P.s));
      drawWriting(c, P, n);
      drawDirections(c, P);
    },
    [P, still],
  );
  const play = useCallback(() => {
    if (!P) return;
    cancelAnimationFrame(raf.current);
    const total = P.pts.length;
    const speed = paceOf(P);
    let n = 0;
    let last = performance.now();
    let rest = 0;
    const tick = (now: number) => {
      // Looping: hold the finished writing for a moment, then write it again.
      if (rest) {
        if (now < rest) return void (raf.current = requestAnimationFrame(tick));
        rest = 0;
        n = 0;
      }
      n = Math.min(total, n + ((now - last) / 1000) * speed);
      last = now;
      frame(Math.round(n));
      if (n >= total && !loop) return;
      if (n >= total) rest = now + 1800;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [P, frame, loop]);

  useEffect(() => {
    if (!P) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (auto && !still && !calm) play();
    else frame(P.pts.length);
    return () => cancelAnimationFrame(raf.current);
  }, [P, auto, still, play, frame]);

  return (
    <div className="flex flex-col items-start gap-2">
      <div
        ref={box}
        dir="ltr"
        data-demo={P ? "ready" : "loading"}
        className="w-full overflow-hidden rounded-xl border border-border bg-white"
      >
        <canvas ref={cv} aria-hidden className="block w-full" />
      </div>
      {playLabel && (
        <button
          type="button"
          data-watch
          onClick={play}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-border bg-background px-4 font-semibold"
        >
          <Play aria-hidden className="size-4" />
          {playLabel}
        </button>
      )}
    </div>
  );
}
