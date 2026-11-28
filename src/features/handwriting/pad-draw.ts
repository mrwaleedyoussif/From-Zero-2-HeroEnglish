import { combine, type Grid, type Mark, markTrace, markWrite } from "./score";

export type Stage = "letters" | "joins" | "words" | "sentences" | "paragraphs";
export type Mode = "trace" | "write";

const SIZES: Record<Stage, number> = {
  letters: 132,
  joins: 116,
  words: 92,
  sentences: 50,
  paragraphs: 40,
};
const PAD = 16;
const INK = "#1d4ed8";

export interface Layout {
  width: number;
  height: number;
  size: number;
  rowH: number;
  font: string;
  /** Each line of the text: the model's baseline, and the row the learner writes in. */
  lines: { text: string; modelBase: number; inkTop: number; inkBase: number }[];
}

/** Where every line goes: big letters for single letters, smaller as the text grows. */
export function layoutOf(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  stage: Stage,
  width: number,
  mode: Mode,
): Layout {
  const room = width - PAD * 2;
  let size = Math.min(SIZES[stage], width / 3.2);
  ctx.font = `${size}px ${family}`;
  const parts = text.split(/\s+/).filter(Boolean);
  const longest = Math.max(...parts.map((w) => ctx.measureText(w).width));
  if (longest > room) size = Math.floor((size * room) / longest);
  const font = `${size}px ${family}`;
  ctx.font = font;
  const wrapped: string[] = [];
  let line = "";
  for (const w of parts) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > room) {
      wrapped.push(line);
      line = w;
    } else line = next;
  }
  if (line) wrapped.push(line);
  const rowH = Math.round(size * 1.9);
  const rows = mode === "write" ? 2 : 1;
  return {
    width,
    height: wrapped.length * rows * rowH,
    size,
    rowH,
    font,
    lines: wrapped.map((t, i) => {
      const top = i * rows * rowH;
      const inkTop = mode === "write" ? top + rowH : top;
      return { text: t, modelBase: top + rowH * 0.66, inkTop, inkBase: inkTop + rowH * 0.66 };
    }),
  };
}

/** The ruled lines and the model: grey under the pen for tracing, dark above the row for writing. */
export function drawGuide(ctx: CanvasRenderingContext2D, l: Layout, mode: Mode) {
  ctx.clearRect(0, 0, l.width, l.height);
  ctx.font = l.font;
  ctx.textBaseline = "alphabetic";
  const x = ctx.measureText("x").actualBoundingBoxAscent || l.size * 0.5;
  const h = ctx.measureText("h").actualBoundingBoxAscent || l.size * 0.75;
  const rule = (y: number, color: string, dash: number[]) => {
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.moveTo(PAD / 2, y);
    ctx.lineTo(l.width - PAD / 2, y);
    ctx.stroke();
  };
  for (const line of l.lines) {
    rule(line.inkBase - h, "#cbd5e1", []);
    rule(line.inkBase - x, "#fca5a5", [6, 6]);
    rule(line.inkBase, "#60a5fa", []);
    ctx.setLineDash([]);
    if (mode === "write") {
      ctx.fillStyle = "#0e223d";
      ctx.fillText(line.text, PAD, line.modelBase);
    } else {
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(line.text, PAD, line.inkBase);
    }
  }
}

export function penFor(ctx: CanvasRenderingContext2D, l: Layout) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(3, l.size * 0.075);
}

function gridOf(ctx: CanvasRenderingContext2D, w: number, h: number, cell: number): Grid {
  const data = ctx.getImageData(0, 0, w, h).data;
  const gw = Math.ceil(w / cell);
  const gh = Math.ceil(h / cell);
  const cells = new Uint8Array(gw * gh);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if ((data[(y * w + x) * 4 + 3] ?? 0) > 60)
        cells[Math.floor(y / cell) * gw + Math.floor(x / cell)] = 1;
  return { w: gw, h: gh, cells };
}

/** Mark what is on the ink canvas, line by line, against the model letters. */
export function markInk(ink: HTMLCanvasElement, l: Layout, mode: Mode): Mark {
  const cell = Math.max(2, Math.round(l.size / 22));
  const w = Math.floor(l.width);
  const scratch = document.createElement("canvas");
  scratch.width = w;
  scratch.height = l.rowH;
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { score: 0, shape: 0, size: null, line: null, codes: ["empty"] };
  const marks = l.lines.map((line) => {
    ctx.clearRect(0, 0, w, l.rowH);
    ctx.font = l.font;
    ctx.fillStyle = "#000";
    ctx.fillText(line.text, PAD, l.rowH * 0.66);
    const model = gridOf(ctx, w, l.rowH, cell);
    ctx.clearRect(0, 0, w, l.rowH);
    // The ink canvas is drawn in device pixels: bring this row back to page pixels.
    const k = ink.width / l.width;
    ctx.drawImage(ink, 0, line.inkTop * k, ink.width, l.rowH * k, 0, 0, w, l.rowH);
    const drawn = gridOf(ctx, w, l.rowH, cell);
    const mark =
      mode === "trace"
        ? markTrace(model, drawn, Math.max(1, Math.round((l.size * 0.07) / cell)))
        : markWrite(model, drawn);
    return { mark, weight: model.cells.reduce((n, c) => n + c, 0) };
  });
  return combine(marks);
}

/** Show how it is written: the model appears from left to right behind a moving pen. */
export function playDemo(ctx: CanvasRenderingContext2D, l: Layout, done: () => void): () => void {
  let frame = 0;
  let stopped = false;
  const widths = l.lines.map((line) => {
    ctx.font = l.font;
    return ctx.measureText(line.text).width;
  });
  const total = widths.reduce((a, b) => a + b, 0);
  const speed = Math.max(l.size * 1.1, total / 14); // pixels a second: never longer than ~14 s
  const start = performance.now();
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const draw = (now: number) => {
    if (stopped) return;
    let left = still ? total : ((now - start) / 1000) * speed;
    ctx.clearRect(0, 0, l.width, l.height);
    ctx.font = l.font;
    ctx.fillStyle = "#ea580c";
    l.lines.forEach((line, i) => {
      const shown = Math.max(0, Math.min(widths[i] ?? 0, left));
      left -= widths[i] ?? 0;
      if (shown <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, line.inkTop, PAD + shown, l.rowH);
      ctx.clip();
      ctx.fillText(line.text, PAD, line.inkBase);
      ctx.restore();
      if (shown < (widths[i] ?? 0)) {
        ctx.beginPath();
        ctx.arc(PAD + shown, line.inkBase - l.size * 0.25, l.size * 0.07 + 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    if (left < speed * 1.2 && !still) frame = requestAnimationFrame(draw);
    else
      setTimeout(
        () => {
          if (!stopped) ctx.clearRect(0, 0, l.width, l.height);
          done();
        },
        still ? 2500 : 0,
      );
  };
  frame = requestAnimationFrame(draw);
  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    ctx.clearRect(0, 0, l.width, l.height);
  };
}
