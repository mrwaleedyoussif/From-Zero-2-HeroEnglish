"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export const TONES = ["violet", "sky", "mint", "rose", "gold"] as const;
export type Tone = (typeof TONES)[number];

/** One colourful choice: an icon, a title in both languages, a hint, and where it leads. */
export function OptionCard({
  tone,
  index,
  icon,
  logo,
  title,
  other,
  otherLang,
  hint,
  soon,
  href,
  onPick,
}: {
  tone: Tone;
  index: number;
  icon: ReactNode;
  /** A school logo shown in place of the icon, on a white tile (logos are drawn for white). */
  logo?: string | null;
  title: string;
  other?: string;
  otherLang: "en" | "ar";
  hint?: string;
  /** Text of the "Soon" badge: the card is shown but can't be chosen. */
  soon?: string;
  href?: { pathname: "/student-login" | "/login" | "/learner"; query?: Record<string, string> };
  onPick?: () => void;
}) {
  const className =
    "z2h-card z2h-rise flex min-h-32 w-full items-center gap-4 rounded-3xl p-5 text-start outline-none focus-visible:ring-4 focus-visible:ring-white";
  const style = { "--i": index } as CSSProperties;
  const body = (
    <>
      {logo ? (
        <Image
          src={logo}
          alt=""
          width={80}
          height={80}
          className="z2h-icon size-20 shrink-0 rounded-2xl !bg-white object-contain p-1"
        />
      ) : (
        <span
          aria-hidden
          className="z2h-icon flex size-16 shrink-0 items-center justify-center rounded-2xl"
        >
          {icon}
        </span>
      )}
      <span className="flex flex-1 flex-col gap-1">
        <span className="text-xl font-bold">{title}</span>
        {other && (
          <span
            lang={otherLang}
            dir={otherLang === "ar" ? "rtl" : "ltr"}
            className={`text-sm opacity-90 ${otherLang === "ar" ? "text-left" : "text-right"}`}
          >
            {other}
          </span>
        )}
        {hint && <span className="text-sm opacity-90">{hint}</span>}
      </span>
      {soon ? (
        <span className="shrink-0 rounded-full bg-black/30 px-3 py-1 text-sm font-semibold">
          {soon}
        </span>
      ) : (
        <ArrowRight aria-hidden className="z2h-arrow size-6 shrink-0 rtl:rotate-180" />
      )}
    </>
  );
  if (soon)
    return (
      <div className={className} style={style} data-tone={tone} data-soon aria-disabled="true">
        {body}
      </div>
    );
  if (href)
    return (
      <Link href={href} className={className} style={style} data-tone={tone} onClick={onPick}>
        {body}
      </Link>
    );
  return (
    <button type="button" className={className} style={style} data-tone={tone} onClick={onPick}>
      {body}
    </button>
  );
}
