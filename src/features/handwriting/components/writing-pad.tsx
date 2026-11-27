"use client";

import { Eraser, Play, SpellCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  drawGuide,
  type Layout,
  layoutOf,
  markInk,
  type Mode,
  penFor,
  playDemo,
  type Stage,
} from "../pad-draw";
import type { Mark } from "../score";

/**
 * The page a learner writes on, with a finger, a pen or a mouse. Tracing shows the letters in
 * grey under the pen; writing shows them above an empty ruled row. "Watch" shows how it is
 * written, "Check" marks what was written.
 */
export function WritingPad({
  text,
  family,
  stage,
  mode,
  onMark,
}: {
  text: string;
  family: string;
  stage: Stage;
  mode: Mode;
  onMark: (mark: Mark) => void;
}) {
  const t = useTranslations("Handwriting");
  const box = useRef<HTMLDivElement>(null);
  const guide = useRef<HTMLCanvasElement>(null);
  const ink = useRef<HTMLCanvasElement>(null);
  const show = useRef<HTMLCanvasElement>(null);
  const layout = useRef<Layout | null>(null);
  const stopDemo = useRef<(() => void) | null>(null);
  const drawing = useRef(false);
  const [height, setHeight] = useState(160);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState<string | false>(false);

  const prepare = useCallback(async () => {
    const width = box.current?.clientWidth ?? 0;
    const g = guide.current?.getContext("2d");
    if (!width || !g) return;
    await document.fonts.load(`40px ${family}`, text).catch(() => undefined);
    const l = layoutOf(g, text, family, stage, width, mode);
    layout.current = l;
    setHeight(l.height);
    const dpr = window.devicePixelRatio || 1;
    for (const c of [guide.current, ink.current, show.current]) {
      if (!c) continue;
      c.width = Math.round(l.width * dpr);
      c.height = Math.round(l.height * dpr);
      c.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    drawGuide(g, l, mode);
    setReady(l.font);
  }, [family, mode, stage, text]);

  useEffect(() => {
    void prepare();
    let width = box.current?.clientWidth ?? 0;
    const watch = new ResizeObserver(() => {
      const now = box.current?.clientWidth ?? 0;
      if (Math.abs(now - width) > 4) {
        width = now;
        void prepare();
      }
    });
    if (box.current) watch.observe(box.current);
    return () => {
      watch.disconnect();
      stopDemo.current?.();
    };
  }, [prepare]);

  const point = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = ink.current?.getContext("2d");
    if (!ctx || !layout.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    penFor(ctx, layout.current);
    const [x, y] = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = ink.current?.getContext("2d");
    const [x, y] = point(e);
    ctx?.lineTo(x, y);
    ctx?.stroke();
  };
  const clear = () => {
    const l = layout.current;
    if (l) ink.current?.getContext("2d")?.clearRect(0, 0, l.width, l.height);
  };
  const watch = () => {
    const ctx = show.current?.getContext("2d");
    if (!ctx || !layout.current) return;
    stopDemo.current?.();
    setPlaying(true);
    stopDemo.current = playDemo(ctx, layout.current, () => setPlaying(false));
  };
  const check = () => {
    if (ink.current && layout.current) onMark(markInk(ink.current, layout.current, mode));
  };
  const layer = "absolute inset-0 size-full";

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={box}
        dir="ltr"
        data-pad={mode}
        data-ready={!!ready}
        data-font={ready || undefined}
        style={{ height }}
        className="relative w-full overflow-hidden rounded-2xl border-2 border-border bg-white"
      >
        <canvas ref={guide} aria-hidden className={layer} />
        <canvas ref={show} aria-hidden className={`${layer} pointer-events-none`} />
        <canvas
          ref={ink}
          role="img"
          aria-label={t(mode === "trace" ? "padTrace" : "padWrite", { text })}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={() => (drawing.current = false)}
          onPointerCancel={() => (drawing.current = false)}
          className={`${layer} cursor-crosshair touch-none`}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={watch} disabled={playing} data-watch>
          <Play aria-hidden /> {t("watch")}
        </Button>
        <Button type="button" variant="outline" onClick={clear} data-clear>
          <Eraser aria-hidden /> {t("clear")}
        </Button>
        <Button type="button" onClick={check} data-check>
          <SpellCheck aria-hidden /> {t("check")}
        </Button>
      </div>
    </div>
  );
}
