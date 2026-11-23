"use client";

import Image from "next/image";
import { ArrowRight, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { HomeTexts } from "../copy";
import { remember, useStored } from "../storage";
import { playWelcome } from "../welcome-sound";
import { Doors, LAST_DOOR } from "./doors";
import { Splash } from "./splash";
import "../home.css";

const WELCOMED = "z2h-welcomed";
const MUTED = "z2h-muted";
const STARS = [
  [8, 14, 0],
  [22, 68, 0.9],
  [38, 9, 1.7],
  [57, 82, 0.4],
  [71, 20, 2.2],
  [88, 61, 1.2],
  [93, 12, 2.7],
  [47, 44, 3],
] as const;
const round =
  "inline-flex size-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white";

/** The home page: an opening screen with a welcome sound, then the choice of how you learn. */
export function HomeExperience({ texts, controls }: { texts: HomeTexts; controls: ReactNode }) {
  const t = texts.main.copy;
  const seen = useStored("session", WELCOMED) === "1";
  const storedMuted = useStored("local", MUTED) === "1";
  const lastDoor = useStored("local", LAST_DOOR);
  const [started, setStarted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [mutedChoice, setMutedChoice] = useState<boolean | null>(null);
  const [school, setSchool] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const muted = mutedChoice ?? storedMuted;
  const splash = !seen && !started;

  const start = () => {
    if (!muted) playWelcome();
    remember("session", WELCOMED, "1");
    setLeaving(true);
    window.setTimeout(() => {
      setStarted(true);
      heading.current?.focus();
    }, 450);
  };
  const toggleSound = () => {
    remember("local", MUTED, muted ? "0" : "1");
    setMutedChoice(!muted);
  };
  const resume =
    lastDoor === "student"
      ? { href: "/student-login", who: t.student }
      : lastDoor === "staff"
        ? { href: "/login", who: t.staff }
        : null;

  return (
    <div className="z2h dark flex min-h-dvh flex-1 flex-col">
      <div aria-hidden className="z2h-glow" />
      {STARS.map(([left, top, delay]) => (
        <span
          key={`${left}-${top}`}
          aria-hidden
          className="z2h-star"
          style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` }}
        />
      ))}

      <header className="relative z-30 flex flex-wrap items-center justify-end gap-2 p-4">
        <button type="button" onClick={toggleSound} className={round} aria-pressed={!muted}>
          {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
          <span className="sr-only">{muted ? t.soundOff : t.soundOn}</span>
        </button>
        {!splash && !muted && (
          <button type="button" onClick={playWelcome} className={round}>
            <RotateCcw aria-hidden />
            <span className="sr-only">{t.replay}</span>
          </button>
        )}
        {controls}
      </header>

      {splash && <Splash texts={texts} leaving={leaving} onStart={start} />}
      <noscript>
        <style>{".z2h-splash{display:none}"}</style>
      </noscript>

      <main
        inert={splash}
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-4 pb-10"
      >
        <h1 className="sr-only">{t.brand}</h1>
        <Image
          src="/brand/logo.webp"
          alt=""
          width={900}
          height={589}
          priority
          className="z2h-logo h-auto w-full max-w-sm"
        />
        <p className="z2h-rise max-w-xl text-center text-lg text-[var(--z-soft)]">{t.tagline}</p>

        <section className="flex w-full flex-col gap-5" aria-labelledby="z2h-choose">
          <h2
            id="z2h-choose"
            ref={heading}
            tabIndex={-1}
            className="z2h-rise text-center text-2xl font-bold outline-none"
          >
            {t.choose}
            <span
              lang={texts.other.lang}
              dir={texts.other.lang === "ar" ? "rtl" : "ltr"}
              className="block text-base font-normal text-[var(--z-soft)]"
            >
              {texts.other.copy.choose}
            </span>
          </h2>
          {resume && !school && (
            <Link
              href={resume.href}
              className="z2h-rise inline-flex min-h-11 items-center gap-2 self-center rounded-full border border-[var(--z-gold)] px-5 font-semibold text-[var(--z-gold-bright)] outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
            >
              {t.continueAs.replace("{who}", resume.who)}
              <ArrowRight aria-hidden className="size-5 rtl:rotate-180" />
            </Link>
          )}
          <Doors key={String(school)} texts={texts} school={school} onSchool={setSchool} />
        </section>

        <footer className="mt-auto flex flex-col items-center gap-3 pt-6 text-center text-sm text-[var(--z-soft)]">
          <p>{t.schoolLine}</p>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
            <Image src="/brand/badge.png" alt="" width={28} height={28} className="rounded-full" />
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
  );
}
