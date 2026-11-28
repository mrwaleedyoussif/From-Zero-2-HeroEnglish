import { GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DROPPED } from "@/features/step/lesson";
import type { Unit } from "../schema";
import { UnitPanel } from "./unit-panel";

const ARABIC = /[؀-ۿ]/;

/** One line of a lesson as its author wrote it: bullets, wrong → right pairs, Arabic. */
function Line({ text }: { text: string }) {
  const t = text.replace(/\t+/g, "   ");
  if (ARABIC.test(t) && t.replace(/[^؀-ۿ]/g, "").length > t.length / 3)
    return (
      <p lang="ar" dir="rtl" className="text-muted-foreground">
        {t}
      </p>
    );
  const pair = /^✗\s*(.+?)\s+→\s+✓\s*(.+)$/.exec(t);
  if (pair)
    return (
      <p dir="ltr" className="text-start">
        <s className="opacity-80">✗ {pair[1]}</s> →{" "}
        <strong className="text-success">✓ {pair[2]}</strong>
      </p>
    );
  if (/^▸/.test(t)) return <p className="ps-4 -indent-4">• {t.replace(/^▸\s*/, "")}</p>;
  if (/^(e\.g\.|Step \d|Answer:)/.test(t)) return <p className="ps-4 text-muted-foreground">{t}</p>;
  return <p>{t}</p>;
}

/**
 * The teaching part of a STEP lesson, section by section (Objectives, Form, Use …).
 * Classroom activities are for teachers: learners do not see them.
 */
export async function UnitNotes({ notes, staff }: { notes: Unit["notes"]; staff: boolean }) {
  const t = await getTranslations("Units");
  const shown = notes.filter((s) => (staff || !s.staff) && !DROPPED.test(s.heading));
  if (shown.length === 0) return null;
  return (
    <UnitPanel hue="indigo" icon={GraduationCap} title={t("lesson")} part="notes">
      {shown.map((s, i) => (
        <details
          key={`${s.heading}-${i}`}
          open={i < 2}
          data-note={s.heading || "intro"}
          className="rounded-xl border border-border bg-background px-4 py-3"
        >
          <summary className="cursor-pointer font-bold">
            {s.heading || t("aboutLesson")}
            {s.staff && (
              <span className="unit-chip ms-2 rounded-full px-2 text-xs">{t("forTeachers")}</span>
            )}
          </summary>
          <div className="mt-2 flex flex-col gap-1.5 leading-relaxed">
            {s.lines.map((line, j) => (
              <Line key={j} text={line} />
            ))}
          </div>
        </details>
      ))}
    </UnitPanel>
  );
}
