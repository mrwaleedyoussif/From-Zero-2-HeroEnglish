"use client";

import Image from "next/image";
import { RotateCcw, Volume2, VolumeX } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import type { HomeTexts } from "../copy";
import { remember, useStored } from "../storage";
import { BLOOM_SECONDS } from "../bloom";
import { playWelcome, stopWelcome } from "../welcome-sound";
import type { SchoolChoice } from "../school-choices";
import { Journey } from "./journey";
import { Splash } from "./splash";
import "../home.css";
import "../home-cards.css";

const WELCOMED = "z2h-welcomed";
const MUTED = "z2h-muted";
/** Letters and marks that drift up behind the page: [glyph, left %, delay s, colour]. */
const FLOATERS = [
  ["A", 6, 0, "violet"],
  ["B", 18, 5, "gold"],
  ["C", 31, 9, "sky"],
  ["✦", 44, 2, "rose"],
  ["Hi", 58, 7, "mint"],
  ["?", 70, 11, "gold"],
  ["Z", 82, 4, "sky"],
  ["★", 93, 8, "violet"],
] as const;
const round =
  "inline-flex size-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white";

/** The home page: an opening screen with a welcome sound, then the choice of how you learn. */
export function HomeExperience({
  texts,
  schools,
  generalOpen,
  controls,
  sidebar,
}: {
  texts: HomeTexts;
  schools: SchoolChoice[];
  generalOpen: boolean;
  controls: ReactNode;
  /** The public menu, beside the page (a bar at the bottom on phones). */
  sidebar: ReactNode;
}) {
  const t = texts.main.copy;
  const seen = useStored("session", WELCOMED) === "1";
  const storedMuted = useStored("local", MUTED) === "1";
  const [started, setStarted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mutedChoice, setMutedChoice] = useState<boolean | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const muted = mutedChoice ?? storedMuted;
  const splash = !seen && !started;

  const timer = useRef(0);
  /** The intro is over (or skipped): fade the opening screen away and show the choices. */
  const enter = () => {
    window.clearTimeout(timer.current);
    remember("session", WELCOMED, "1");
    setLeaving(true);
    window.setTimeout(() => {
      setStarted(true);
      heading.current?.focus();
    }, 450);
  };
  const start = () => {
    if (!muted) playWelcome();
    // People who ask for less motion go straight in; the music still plays.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return enter();
    setPlaying(true);
    timer.current = window.setTimeout(enter, (BLOOM_SECONDS - 0.5) * 1000);
  };
  const skip = () => {
    stopWelcome();
    enter();
  };
  const toggleSound = () => {
    remember("local", MUTED, muted ? "0" : "1");
    if (!muted) stopWelcome();
    setMutedChoice(!muted);
  };
  return (
    <div className="z2h dark flex min-h-dvh flex-1 flex-col md:flex-row">
      {sidebar}
      <div className="relative flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <div aria-hidden className="z2h-aurora">
          <i />
          <i />
          <i />
          <i />
        </div>
        {FLOATERS.map(([glyph, left, delay, tone]) => (
          <span
            key={`${glyph}-${left}`}
            aria-hidden
            className="z2h-floater"
            data-tone={tone}
            style={{ left: `${left}%`, animationDelay: `${delay}s` }}
          >
            {glyph}
          </span>
        ))}

        <header className="relative z-30 flex flex-wrap items-center justify-end gap-2 p-4">
          <button type="button" onClick={toggleSound} className={round} aria-pressed={!muted}>
            {muted ? (
              <VolumeX aria-hidden className="text-rose-300" />
            ) : (
              <Volume2 aria-hidden className="text-sky-300" />
            )}
            <span className="sr-only">{muted ? t.soundOff : t.soundOn}</span>
          </button>
          {!splash && !muted && (
            <button type="button" onClick={playWelcome} className={round}>
              <RotateCcw aria-hidden className="text-emerald-300" />
              <span className="sr-only">{t.replay}</span>
            </button>
          )}
          {controls}
        </header>

        {splash && (
          <Splash texts={texts} playing={playing} leaving={leaving} onStart={start} onSkip={skip} />
        )}
        <noscript>
          <style>{".z2h-splash{display:none}"}</style>
        </noscript>

        <main
          inert={splash}
          className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-4 pb-10"
        >
          <h1 className="sr-only">{t.brand}</h1>
          <div className="z2h-logo-wrap">
            <Image
              src="/brand/wordmark.webp"
              alt=""
              width={900}
              height={589}
              priority
              className="z2h-logo h-auto w-full max-w-sm"
            />
          </div>
          <p className="z2h-rise max-w-xl text-center text-lg text-[var(--z-soft)]">{t.tagline}</p>

          <Journey texts={texts} schools={schools} generalOpen={generalOpen} heading={heading} />

          <footer className="mt-auto flex flex-col items-center gap-3 pt-6 text-center text-sm text-[var(--z-soft)]">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1.5 ps-1.5 pe-5">
              <Image
                src="/brand/designer.webp"
                alt=""
                width={48}
                height={48}
                className="size-12 rounded-full border-2 border-[var(--z-gold)] object-cover"
              />
              <span>
                {t.designedBy} <strong className="text-white">{t.designer}</strong>
                <span
                  lang={texts.other.lang}
                  dir={texts.other.lang === "ar" ? "rtl" : "ltr"}
                  className="ms-2 inline-block"
                >
                  {texts.other.copy.designer}
                </span>
              </span>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
