"use client";

import Image from "next/image";
import { SkipForward, Sparkles } from "lucide-react";
import type { HomeTexts } from "../copy";
import { BloomCanvas } from "./bloom-canvas";

/**
 * The opening screen. First the logo and one big Start button over the bloom (the tap is what
 * lets the music play); then the intro itself: the bloom drawn again to the music, with Skip.
 */
export function Splash({
  texts,
  playing,
  leaving,
  onStart,
  onSkip,
}: {
  texts: HomeTexts;
  /** The intro is running (Start was pressed). */
  playing: boolean;
  leaving: boolean;
  onStart: () => void;
  onSkip: () => void;
}) {
  const other = texts.other.lang;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={texts.main.copy.brand}
      data-leaving={leaving}
      data-playing={playing}
      className="z2h-splash fixed inset-0 z-20 flex flex-col items-center justify-center gap-6 overflow-hidden px-6 text-center"
    >
      <BloomCanvas
        run={playing ? 1 : 0}
        className="z2h-bloom pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[min(94vw,84dvh)] -translate-x-1/2 -translate-y-1/2"
      />
      {playing ? (
        <button
          type="button"
          autoFocus
          onClick={onSkip}
          className="absolute end-4 bottom-6 z-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 bg-black/50 px-5 font-semibold text-white outline-none hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white"
        >
          <SkipForward aria-hidden className="size-5 text-[#fda4af] rtl:-scale-x-100" />
          {texts.main.copy.skip}
          <span lang={other} dir={other === "ar" ? "rtl" : "ltr"} className="opacity-80">
            {texts.other.copy.skip}
          </span>
        </button>
      ) : (
        <>
          <div className="z2h-logo-wrap relative">
            <Image
              src="/brand/wordmark.webp"
              alt=""
              width={900}
              height={589}
              priority
              className="z2h-logo h-auto w-full max-w-md"
            />
          </div>
          <button
            type="button"
            autoFocus
            onClick={onStart}
            className="z2h-start relative inline-flex min-h-14 items-center gap-3 rounded-full px-10 py-3 text-xl font-bold outline-none focus-visible:ring-4 focus-visible:ring-white"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <Sparkles aria-hidden className="size-6" />
            <span>{texts.main.copy.start}</span>
            <span
              lang={other}
              dir={other === "ar" ? "rtl" : "ltr"}
              className="font-semibold opacity-80"
            >
              {texts.other.copy.start}
            </span>
          </button>
        </>
      )}
    </div>
  );
}
