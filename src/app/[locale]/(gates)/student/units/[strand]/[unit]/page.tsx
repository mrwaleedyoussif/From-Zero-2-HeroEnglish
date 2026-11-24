import {
  BookOpenText,
  ChevronLeft,
  HelpCircle,
  Languages,
  Lightbulb,
  PenLine,
  Target,
} from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { SpeakButton } from "@/features/units/components/speak-button";
import { Bi, UnitPanel } from "@/features/units/components/unit-panel";
import { UnitQuestion } from "@/features/units/components/unit-question";
import { UnitSkill } from "@/features/units/components/unit-skill";
import { UnitWriting } from "@/features/units/components/unit-writing";
import { loadUnit } from "@/features/units/queries";
import { publicQuestion, shownAnswer, triesAllowed } from "@/features/units/schema";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";

/** One unit, in its author's order: aims, words, reading, questions, writing lesson and task. */
export default async function UnitPage({
  params,
}: PageProps<"/[locale]/student/units/[strand]/[unit]">) {
  const { locale, strand, unit: unitId } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "learning:self", "page.student.units");
  const loaded = await loadUnit(actor, unitId);
  if (!loaded || loaded.unit.strand !== strand) notFound();
  const { unit, answers, writing } = loaded;
  const t = await getTranslations("Units");
  const skill = unit.writing_skill;
  const task = unit.writing_task;

  return (
    <>
      <PageHeader
        title={`${t("unitN", { n: unit.unit })} · ${unit.title}`}
        description={`${unit.level}${unit.title_ar ? ` · ${unit.title_ar}` : ""}`}
        actions={
          <Link
            href={`/student/units/${strand}`}
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-white/30 px-4 text-sm font-semibold hover:bg-white/10"
          >
            <ChevronLeft aria-hidden className="size-4 rtl:rotate-180" />
            {t("allUnits")}
          </Link>
        }
      />
      {unit.objectives.length > 0 && (
        <UnitPanel hue="blue" icon={Target} title={t("objectives")} part="objectives">
          <ul className="flex flex-col gap-2">
            {unit.objectives.map((o) => (
              <li key={o.en} className="flex gap-2">
                <span aria-hidden>🎯</span>
                <Bi en={o.en} ar={o.ar} />
              </li>
            ))}
          </ul>
        </UnitPanel>
      )}
      {unit.vocabulary.length > 0 && (
        <UnitPanel hue="violet" icon={Languages} title={t("words")} part="words">
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {unit.vocabulary.map((w) => (
              <li
                key={w.id}
                className="flex flex-col gap-1 rounded-xl border border-border bg-background p-3"
              >
                <div className="flex items-center gap-2">
                  <SpeakButton text={w.word} label={t("listen")} />
                  <strong className="text-lg">{w.word}</strong>
                  {w.pos && <span className="unit-chip rounded-full px-2 text-xs">{w.pos}</span>}
                </div>
                {w.ipa && (
                  <span dir="ltr" className="text-sm text-muted-foreground">
                    {w.ipa}
                  </span>
                )}
                <Bi en={w.definition} ar={w.arabic} />
                {w.example && <em className="text-sm">“{w.example}”</em>}
              </li>
            ))}
          </ul>
        </UnitPanel>
      )}
      {unit.hook && (
        <UnitPanel hue="amber" icon={Lightbulb} title={t("before")} part="hook">
          <Bi en={unit.hook.question.en} ar={unit.hook.question.ar} />
          <Bi en={unit.hook.prediction.en} ar={unit.hook.prediction.ar} />
        </UnitPanel>
      )}
      <UnitPanel hue="green" icon={BookOpenText} title={unit.passage.title} part="passage">
        <div dir="ltr" className="unit-passage flex flex-col gap-3 text-start text-lg">
          {unit.passage.paragraphs.map((p, i) => (
            <div key={p} className="flex items-start gap-2">
              <SpeakButton text={p} label={t("listenPara", { n: i + 1 })} />
              <p>{p}</p>
            </div>
          ))}
        </div>
      </UnitPanel>
      <UnitPanel hue="rose" icon={HelpCircle} title={t("questions")} part="questions">
        <ol className="flex flex-col gap-6">
          {unit.comprehension.map((q, i) => {
            const a = answers[q.id];
            const settled = a && (a.correct !== false || a.tries >= triesAllowed(q));
            return (
              <UnitQuestion
                key={q.id}
                unitId={unit.id}
                number={i + 1}
                q={publicQuestion(q)}
                settled={
                  settled
                    ? {
                        choice: a.choice,
                        correct: a.correct,
                        answer: shownAnswer(q),
                        explanation: q.explanation,
                      }
                    : undefined
                }
              />
            );
          })}
        </ol>
      </UnitPanel>
      {skill && <UnitSkill skill={skill} title={skill.name.en} showAnswer={t("showAnswer")} />}
      {task && (
        <UnitPanel hue="orange" icon={PenLine} title={t("writingTask")} part="task">
          <Bi en={task.prompt.en} ar={task.prompt.ar} />
          {task.planning_frame.length > 0 && (
            <ol className="flex list-decimal flex-col gap-1 ps-5 text-sm">
              {task.planning_frame.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          )}
          {task.starters.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-sm">
              {task.starters.map((s) => (
                <li key={s} className="unit-chip rounded-full px-3 py-1">
                  {s}
                </li>
              ))}
            </ul>
          )}
          <UnitWriting unitId={unit.id} initial={writing} range={task.word_count} />
          {task.checklist.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {task.checklist.map((c) => (
                <li key={c.en} className="flex gap-2">
                  <span aria-hidden>☑️</span>
                  <Bi en={c.en} ar={c.ar} />
                </li>
              ))}
            </ul>
          )}
        </UnitPanel>
      )}
    </>
  );
}
