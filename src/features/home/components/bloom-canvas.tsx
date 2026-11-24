"use client";

import { useEffect, useRef } from "react";
import { BLOOM_SECONDS, bloomDots } from "../bloom";

const RED = "255, 46, 66";
const WHITE = "255, 236, 240";

/**
 * Draws the bloom on a canvas. `run` restarts it (the Start tap); people who ask for reduced
 * motion get the finished flower, standing still.
 */
export function BloomCanvas({ run, className }: { run: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dots = bloomDots();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const began = performance.now();
    let frame = 0;

    const draw = (now: number) => {
      const t = still ? BLOOM_SECONDS + 2 : (now - began) / 1000;
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const side = Math.round(Math.min(box.width, box.height) * ratio);
      if (canvas.width !== side) canvas.width = canvas.height = side;
      const half = side / 2;
      const reach = half * 0.94;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, side, side);
      ctx.translate(half, half);
      ctx.rotate(still ? 0 : t * 0.05); // the whole flower turns very slowly
      const unit = Math.max(1, side / 420);
      for (const d of dots) {
        if (d.at > t) break; // sorted by time
        const age = t - d.at;
        const fresh = age < 0.18; // the point of light at the head of each trail
        const twinkle = d.white ? 0.75 + 0.25 * Math.sin(t * 3 + d.x * 40) : 0.9;
        ctx.fillStyle = `rgba(${d.white || fresh ? WHITE : RED}, ${fresh ? 1 : twinkle})`;
        const s = unit * d.size * (fresh ? 1.9 : 1);
        ctx.beginPath();
        ctx.arc(d.x * reach, d.y * reach, s, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!still) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [run]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
