"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { HomeTexts } from "../copy";

/** The opening screen: the logo and one big Start button (the tap that lets the sound play). */
export function Splash({
  texts,
  leaving,
  onStart,
}: {
  texts: HomeTexts;
  leaving: boolean;
  onStart: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={texts.main.copy.brand}
      data-leaving={leaving}
      className="z2h-splash absolute inset-0 z-20 flex flex-col items-center justify-center gap-8 px-6 text-center"
    >
      <div className="z2h-logo-wrap">
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
        className="z2h-start inline-flex min-h-14 items-center gap-3 rounded-full px-10 py-3 text-xl font-bold outline-none focus-visible:ring-4 focus-visible:ring-white"
        style={{ "--i": 2 } as React.CSSProperties}
      >
        <Sparkles aria-hidden className="size-6" />
        <span>{texts.main.copy.start}</span>
        <span
          lang={texts.other.lang}
          dir={texts.other.lang === "ar" ? "rtl" : "ltr"}
          className="font-semibold opacity-80"
        >
          {texts.other.copy.start}
        </span>
      </button>
    </div>
  );
}
