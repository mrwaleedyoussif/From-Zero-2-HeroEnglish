"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { drawGuide, layoutOf, playDemo } from "../pad-draw";

/**
 * "How to learn here": a short moving demonstration (the letters being written, again and
 * again) beside the four things to do. It plays by itself and needs no sound.
 */
export function HowTo({ family, sample }: { family: string; sample: string }) {
  const t = useTranslations("Handwriting");
  const box = useRef<HTMLDivElement>(null);
  const guide = useRef<HTMLCanvasElement>(null);
  const show = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let stop: (() => void) | undefined;
    let again: ReturnType<typeof setTimeout>;
    let gone = false;
    void (async () => {
      const g = guide.current?.getContext("2d");
      const s = show.current?.getContext("2d");
      const width = box.current?.clientWidth ?? 0;
      if (!g || !s || !width) return;
      await document.fonts.load(`40px ${family}`, sample).catch(() => undefined);
      const l = layoutOf(g, sample, family, "words", width, "trace");
      const dpr = window.devicePixelRatio || 1;
      for (const c of [guide.current, show.current]) {
        if (!c) continue;
        c.width = Math.round(l.width * dpr);
        c.height = Math.round(l.height * dpr);
        c.style.height = `${l.height}px`;
        c.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      if (box.current) box.current.style.height = `${l.height}px`;
      drawGuide(g, l, "trace");
      const loop = () => {
        if (gone) return;
        stop = playDemo(s, l, () => (again = setTimeout(loop, 1800)));
      };
      loop();
    })();
    return () => {
      gone = true;
      clearTimeout(again);
      stop?.();
    };
  }, [family, sample]);
  return (
    <details open data-how-to className="rounded-2xl border border-border bg-card p-4">
      <summary className="cursor-pointer text-lg font-bold">{t("howTitle")}</summary>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div
          ref={box}
          dir="ltr"
          aria-hidden
          className="relative h-40 overflow-hidden rounded-xl border border-border bg-white"
        >
          <canvas ref={guide} className="absolute inset-0 w-full" />
          <canvas ref={show} className="absolute inset-0 w-full" />
        </div>
        <ol className="flex list-decimal flex-col gap-2 ps-5">
          {(["watch", "trace", "write", "check"] as const).map((k) => (
            <li key={k}>{t(`how.${k}`)}</li>
          ))}
        </ol>
      </div>
    </details>
  );
}
