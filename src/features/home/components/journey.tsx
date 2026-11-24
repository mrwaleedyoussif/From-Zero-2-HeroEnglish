"use client";

import {
  BookOpenCheck,
  Building2,
  ChevronLeft,
  GraduationCap,
  MapPin,
  School,
  Users,
} from "lucide-react";
import { type RefObject, useState } from "react";
import { audienceFor } from "@/features/departments/catalog";
import { type HomeTexts, type Step, STEP_HEADING as HEADING } from "../copy";
import type { SchoolChoice } from "../school-choices";
import { schoolLogo } from "../school-logos";
import { remember } from "../storage";
import { DepartmentsLink } from "./departments-link";
import { OptionCard, TONES } from "./option-card";
import { DOOR, ResumeLink, SCHOOL } from "./resume-link";
import { SchoolStrip } from "./school-strip";

const big = "size-8";

/** The choices, one step at a time: how you learn → school → branch → student or staff. */
export function Journey({
  texts,
  schools,
  generalOpen,
  heading,
}: {
  texts: HomeTexts;
  schools: SchoolChoice[];
  generalOpen: boolean;
  heading: RefObject<HTMLHeadingElement | null>;
}) {
  const t = texts.main.copy;
  const [main, other] = [texts.main.lang, texts.other.lang];
  const [step, setStep] = useState<Step>("who");
  const [school, setSchool] = useState<SchoolChoice | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const go = (next: Step) => {
    setStep(next);
    heading.current?.focus();
  };
  const pickBranch = (branchCode: string) => {
    setCode(branchCode);
    remember("local", SCHOOL, branchCode);
    go("role");
  };
  const pickSchool = (s: SchoolChoice) => {
    setSchool(s);
    const only = s.branches.length === 1 ? s.branches[0] : undefined;
    if (only && !only.name) pickBranch(only.code);
    else go("branch");
  };
  const back = () =>
    go(
      step === "role" && school && (school.branches.length > 1 || school.branches[0]?.name)
        ? "branch"
        : step === "school" || !schools.length
          ? "who"
          : "school",
    );
  // Which departments to preview: general learners' at first, the chosen school's after.
  const audience =
    step === "who"
      ? "general"
      : school && step !== "school"
        ? audienceFor({ code: "", name_en: school.name.en })
        : null;
  const query = (c: string | null) => (c ? { school: c } : undefined);

  return (
    <section className="flex w-full flex-col gap-5" aria-labelledby="z2h-choose">
      <h2
        id="z2h-choose"
        ref={heading}
        tabIndex={-1}
        key={`h-${step}`}
        className="z2h-rise text-center text-3xl font-extrabold outline-none"
      >
        <span className="z2h-rainbow">{t[HEADING[step]]}</span>
        <span
          lang={other}
          dir={other === "ar" ? "rtl" : "ltr"}
          className="block text-base font-normal text-[var(--z-soft)]"
        >
          {texts.other.copy[HEADING[step]]}
        </span>
      </h2>

      {step === "who" && <ResumeLink texts={texts} />}

      <div key={step} className="grid gap-4 sm:grid-cols-2">
        {step === "who" && (
          <>
            <OptionCard
              tone="mint"
              index={0}
              icon={<BookOpenCheck className={big} />}
              title={t.general}
              other={texts.other.copy.general}
              otherLang={other}
              hint={t.generalHint}
              soon={generalOpen ? undefined : t.soon}
              href={generalOpen ? { pathname: "/learner" } : undefined}
            />
            <OptionCard
              tone="gold"
              index={1}
              icon={<School className={big} />}
              title={t.school}
              other={texts.other.copy.school}
              otherLang={other}
              hint={t.schoolHint}
              onPick={() => go(schools.length ? "school" : "role")}
            />
          </>
        )}
        {step === "school" &&
          schools.map((s, i) => (
            <OptionCard
              key={s.name.en}
              tone={TONES[i % TONES.length] ?? "violet"}
              index={i}
              icon={<Building2 className={big} />}
              logo={schoolLogo(s.name.en)}
              title={s.name[main]}
              other={s.name[other] === s.name[main] ? undefined : s.name[other]}
              otherLang={other}
              onPick={() => pickSchool(s)}
            />
          ))}
        {step === "branch" &&
          school?.branches.map((b, i) => (
            <OptionCard
              key={b.code}
              tone={TONES[(i + 1) % TONES.length] ?? "sky"}
              index={i}
              icon={<MapPin className={big} />}
              logo={schoolLogo(school.name.en)}
              title={b.name?.[main] ?? school.name[main]}
              other={b.name && b.name[other] !== b.name[main] ? b.name[other] : undefined}
              otherLang={other}
              onPick={() => pickBranch(b.code)}
            />
          ))}
        {step === "role" && (
          <>
            <OptionCard
              tone="violet"
              index={0}
              icon={<GraduationCap className={big} />}
              title={t.student}
              other={texts.other.copy.student}
              otherLang={other}
              hint={t.studentHint}
              href={{ pathname: "/student-login", query: query(code) }}
              onPick={() => remember("local", DOOR, "student")}
            />
            <OptionCard
              tone="sky"
              index={1}
              icon={<Users className={big} />}
              title={t.staff}
              other={texts.other.copy.staff}
              otherLang={other}
              hint={t.staffHint}
              href={{ pathname: "/login" }}
              onPick={() => remember("local", DOOR, "staff")}
            />
          </>
        )}
      </div>

      {audience && <DepartmentsLink texts={texts} audience={audience} />}
      {step !== "who" && (
        <button
          type="button"
          onClick={back}
          className="z2h-rise inline-flex min-h-11 items-center gap-1 self-start rounded-full px-4 text-[var(--z-soft)] outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white"
        >
          <ChevronLeft aria-hidden className="size-5 rtl:rotate-180" />
          {t.back}
        </button>
      )}
      {/* Only on the school user's path; the school step already shows schools as its cards. */}
      {(step === "branch" || step === "role" || (step === "school" && !schools.length)) && (
        <SchoolStrip texts={texts} />
      )}
    </section>
  );
}
