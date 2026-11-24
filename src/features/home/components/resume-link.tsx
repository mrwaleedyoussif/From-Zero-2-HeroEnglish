"use client";

import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { HomeTexts } from "../copy";
import { useStored } from "../storage";

export const DOOR = "z2h-door";
export const SCHOOL = "z2h-school";

/** A shortcut back to the door (and school) this browser used last time, if any. */
export function ResumeLink({ texts }: { texts: HomeTexts }) {
  const t = texts.main.copy;
  const lastDoor = useStored("local", DOOR);
  const lastSchool = useStored("local", SCHOOL);
  const resume =
    lastDoor === "student"
      ? { pathname: "/student-login" as const, who: t.student }
      : lastDoor === "staff"
        ? { pathname: "/login" as const, who: t.staff }
        : null;
  if (!resume) return null;
  return (
    <Link
      href={{ pathname: resume.pathname, query: lastSchool ? { school: lastSchool } : undefined }}
      className="z2h-rise inline-flex min-h-11 items-center gap-2 self-center rounded-full border border-[var(--z-gold)] px-5 font-semibold text-[var(--z-gold-bright)] outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
    >
      {t.continueAs.replace("{who}", resume.who)}
      <ArrowRight aria-hidden className="size-5 rtl:rotate-180" />
    </Link>
  );
}
