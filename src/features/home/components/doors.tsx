"use client";

import { ArrowRight, BookOpenCheck, ChevronLeft, GraduationCap, School, Users } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { HomeKey, HomeTexts } from "../copy";
import { remember } from "../storage";
import { Bi } from "./bi";

export const LAST_DOOR = "z2h-door";
const order = (i: number) => ({ "--i": i }) as CSSProperties;
const card =
  "z2h-card z2h-rise flex min-h-36 w-full items-center gap-4 rounded-3xl p-5 text-start outline-none focus-visible:ring-4 focus-visible:ring-[var(--z-gold-bright)]";

function Face({
  texts,
  icon,
  tint,
  title,
  hint,
  end,
}: {
  texts: HomeTexts;
  icon: ReactNode;
  tint: string;
  title: HomeKey;
  hint: HomeKey;
  end: ReactNode;
}) {
  return (
    <>
      <span
        aria-hidden
        className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-[#0e223d]"
        style={{ background: tint }}
      >
        {icon}
      </span>
      <span className="flex flex-1 flex-col gap-2">
        <Bi texts={texts} k={title} className="text-xl font-bold" />
        <span className="text-sm text-[var(--z-soft)]">{texts.main.copy[hint]}</span>
      </span>
      {end}
    </>
  );
}

const arrow = (
  <ArrowRight aria-hidden className="size-6 shrink-0 text-[var(--z-gold-bright)] rtl:rotate-180" />
);

/** Step 1: general learner or school user. Step 2 (school): student or staff sign-in. */
export function Doors({
  texts,
  school,
  onSchool,
}: {
  texts: HomeTexts;
  school: boolean;
  onSchool: (open: boolean) => void;
}) {
  if (school)
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/student-login"
            className={card}
            style={order(0)}
            onClick={() => remember("local", LAST_DOOR, "student")}
          >
            <Face
              texts={texts}
              icon={<GraduationCap className="size-8" />}
              tint="var(--z-violet)"
              title="student"
              hint="studentHint"
              end={arrow}
            />
          </Link>
          <Link
            href="/login"
            className={card}
            style={order(1)}
            onClick={() => remember("local", LAST_DOOR, "staff")}
          >
            <Face
              texts={texts}
              icon={<Users className="size-8" />}
              tint="var(--z-sky)"
              title="staff"
              hint="staffHint"
              end={arrow}
            />
          </Link>
        </div>
        <button
          type="button"
          onClick={() => onSchool(false)}
          className="z2h-rise inline-flex min-h-11 items-center gap-1 self-start rounded-full px-4 text-[var(--z-soft)] outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white"
          style={order(2)}
        >
          <ChevronLeft aria-hidden className="size-5 rtl:rotate-180" />
          {texts.main.copy.back}
        </button>
      </div>
    );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* No flow for independent learners yet: visible, marked "Soon", not clickable. */}
      <div className={`${card} opacity-70`} style={order(0)} aria-disabled="true">
        <Face
          texts={texts}
          icon={<BookOpenCheck className="size-8" />}
          tint="var(--z-mint)"
          title="general"
          hint="generalHint"
          end={
            <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
              {texts.main.copy.soon}
            </span>
          }
        />
      </div>
      <button type="button" className={card} style={order(1)} onClick={() => onSchool(true)}>
        <Face
          texts={texts}
          icon={<School className="size-8" />}
          tint="var(--z-gold)"
          title="school"
          hint="schoolHint"
          end={arrow}
        />
      </button>
    </div>
  );
}
