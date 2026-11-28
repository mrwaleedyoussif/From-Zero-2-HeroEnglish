"use client";

import { Check, Eraser, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  drawDirections,
  drawInk,
  drawLines,
  drawModel,
  drawResult,
  inkWidth,
  setup,
} from "../strokes/draw";
import type { Pt } from "../strokes/geometry";
import { type Grade, grade, type Mode } from "../strokes/grade";
import type { Style } from "../types";
import { usePlaced } from "./use-placed";

const btn =
  "inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-border bg-background px-4 font-semibold";

/**
 * The page a learner writes on with a finger, pen or mouse. Tracing shows the model underneath
 * (a soft band, a dashed line, start dots and arrows); writing shows the lines only. Check marks
 * the ink and colours the model: green where it was written, red where it was missed.
 */
export function StrokePad({
  style,
  text,
  mode,
  labels,
  onGrade,
}: {
  style: Style;
  text: string;
  mode: Mode;
  labels: { pad: string; clear: string; undo: string; check: string };
  onGrade: (g: Grade | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const ink = useRef<Pt[][]>([]);
  const cur = useRef<Pt[] | null>(null);
  const [result, setResult] = useState<Grade | null>(null);
  const P = usePlaced(box, style, text);

  const draw = useCallback(() => {
    if (!P || !cv.current) return;
    const c = setup(cv.current, P.w, P.h);
    drawLines(c, P.rows, P.w);
    if (mode === "trace" && !result) {
      drawModel(c, P, "#E8EEF9", Math.max(8, 96 * P.s));
      drawModel(c, P, "#9AAACB", Math.max(1.5, 8 * P.s), [2, Math.max(6, 22 * P.s)]);
      drawDirections(c, P);
    }
    if (result) drawResult(c, P, result, mode === "trace");
    drawInk(c, P, ink.current, !!result, !!result && mode === "trace");
  }, [P, mode, result]);

  // A new layout (the page turned or resized) starts a clean page.
  useEffect(() => {
    ink.current = [];
  }, [P]);
  useEffect(draw, [draw]);

  const reset = () => {
    ink.current = [];
    setResult(null);
    onGrade(null);
    requestAnimationFrame(draw);
  };
  const at = (e: React.PointerEvent): Pt => {
    const r = cv.current!.getBoundingClientRect();
    return [(e.clientX - r.left) * (P!.w / r.width), (e.clientY - r.top) * (P!.h / r.height)];
  };
  const down = (e: React.PointerEvent) => {
    if (!P) return;
    e.preventDefault();
    if (result) {
      ink.current = [];
      setResult(null);
      onGrade(null);
    }
    cv.current?.setPointerCapture?.(e.pointerId);
    cur.current = [at(e)];
    ink.current.push(cur.current);
    draw();
  };
  const move = (e: React.PointerEvent) => {
    const line = cur.current;
    const c = cv.current?.getContext("2d");
    if (!line || !P || !c) return;
    const q = at(e);
    const l = line[line.length - 1]!;
    if (Math.hypot(q[0] - l[0], q[1] - l[1]) < 1.5) return;
    line.push(q);
    c.strokeStyle = "#1D3FAA";
    c.lineWidth = inkWidth(P);
    c.beginPath();
    c.moveTo(l[0], l[1]);
    c.lineTo(q[0], q[1]);
    c.stroke();
  };
  const up = () => void (cur.current = null);
  const check = () => {
    if (!P) return;
    const g = grade(P, ink.current, mode);
    setResult(g.empty ? null : g);
    onGrade(g);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={box}
        dir="ltr"
        data-pad={mode}
        data-ready={P ? "true" : "false"}
        data-model={P && P.pts.length < 900 ? JSON.stringify(roundAll(P.strokes)) : undefined}
        className="w-full overflow-hidden rounded-xl border-2 border-border bg-white"
      >
        <canvas
          ref={cv}
          role="img"
          aria-label={labels.pad}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
          className="block w-full touch-none"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-clear onClick={reset} className={btn}>
          <Eraser aria-hidden className="size-4" />
          {labels.clear}
        </button>
        <button
          type="button"
          data-undo
          onClick={() => {
            if (result) return;
            ink.current.pop();
            draw();
          }}
          className={btn}
        >
          <Undo2 aria-hidden className="size-4" />
          {labels.undo}
        </button>
        <button
          type="button"
          data-check
          onClick={check}
          className={`${btn} border-primary bg-primary text-primary-foreground`}
        >
          <Check aria-hidden className="size-4" />
          {labels.check}
        </button>
      </div>
    </div>
  );
}

const roundAll = (strokes: Pt[][]) =>
  strokes.map((s) =>
    s.filter((_, i) => i % 3 === 0).map((p) => [Math.round(p[0]), Math.round(p[1])]),
  );
