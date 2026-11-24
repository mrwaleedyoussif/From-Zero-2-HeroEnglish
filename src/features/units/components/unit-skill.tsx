import { PencilRuler } from "lucide-react";
import type { Unit } from "../schema";
import { Bi, UnitPanel } from "./unit-panel";

/** The unit's writing lesson: the rule, wrong and right examples, and practice with answers. */
export function UnitSkill({
  skill,
  title,
  showAnswer,
}: {
  skill: NonNullable<Unit["writing_skill"]>;
  title: string;
  showAnswer: string;
}) {
  return (
    <UnitPanel hue="teal" icon={PencilRuler} title={title} part="skill">
      <span lang="ar" dir="rtl" className="-mt-3 text-sm text-muted-foreground">
        {skill.name.ar}
      </span>
      <ul className="flex list-disc flex-col gap-1 ps-5">
        {skill.lesson.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {skill.lesson_ar && (
        <p lang="ar" dir="rtl" className="text-muted-foreground">
          {skill.lesson_ar}
        </p>
      )}
      {skill.examples.map((e) => (
        <div key={e.wrong} className="rounded-xl border border-border bg-background p-3 text-sm">
          <p>
            <span aria-hidden>✗</span> <s>{e.wrong}</s>
          </p>
          <p className="font-semibold">
            <span aria-hidden>✓</span> {e.right}
          </p>
          {e.note && <p className="text-muted-foreground">{e.note}</p>}
        </div>
      ))}
      {skill.practice.map((p) => (
        <div key={p.id} data-practice={p.id} className="flex flex-col gap-2">
          <Bi en={p.instruction.en} ar={p.instruction.ar} />
          <p dir="ltr" className="unit-chip rounded-xl px-3 py-2 text-start font-medium">
            {p.stem}
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">{showAnswer}</summary>
            <p dir="ltr" className="mt-1 text-start">
              {p.answer}
            </p>
          </details>
        </div>
      ))}
    </UnitPanel>
  );
}
