import { ChevronLeft, ChevronRight, Lightbulb, PenLine, Target } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Bi, UnitPanel } from "@/features/units/components/unit-panel";
import { UnitGrammar, UnitQuestions, UnitText } from "@/features/units/components/unit-sections";
import {
  UnitScript,
  UnitShadow,
  UnitSpeaking,
} from "@/features/units/components/unit-speech-sections";
import { UnitSkill } from "@/features/units/components/unit-skill";
import { UnitLocked } from "@/features/units/components/unit-locked";
import { UnitWords } from "@/features/units/components/unit-words";
import { UnitWriting } from "@/features/units/components/unit-writing";
import { loadUnit, strandUnits } from "@/features/units/queries";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";

/** Submitting writing may wait up to 50 s for the AI reader: allow the request that long. */
export const maxDuration = 60;

/** One unit, in its author's order: aims, words, reading, questions, writing lesson and task. */
export default async function UnitPage({
  params,
}: PageProps<"/[locale]/student/units/[strand]/[unit]">) {
  const { locale, strand, unit: unitId } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "learning:self", "page.student.units");
  const all = await strandUnits(actor, strand);
  const card = all.find((u) => u.id === unitId);
  if (card?.locked) return <UnitLocked strand={strand} unit={card.unit} title={card.title} />;
  const loaded = await loadUnit(actor, unitId);
  if (!loaded || loaded.unit.strand !== strand) notFound();
  const { unit, answers, writing, audio, images } = loaded;
  const next = all[all.findIndex((u) => u.id === unit.id) + 1];
  const t = await getTranslations("Units");
  const skill = unit.writing_skill;
  const task = unit.writing_task;
  const grammar = unit.grammar_lesson;

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
        <UnitWords unit={unit} audio={audio} images={images} answers={answers} />
      )}
      {unit.hook && (
        <UnitPanel hue="amber" icon={Lightbulb} title={t("before")} part="hook">
          <Bi en={unit.hook.question.en} ar={unit.hook.question.ar} />
          <Bi en={unit.hook.prediction.en} ar={unit.hook.prediction.ar} />
        </UnitPanel>
      )}
      {unit.script && <UnitScript script={unit.script} unitId={unit.id} audio={audio} />}
      <UnitQuestions
        unitId={unit.id}
        title={t("listenQuestions")}
        part="listening"
        set="listening"
        questions={unit.listening}
        answers={answers}
      />
      {unit.speaking_task && (
        <UnitSpeaking
          task={unit.speaking_task}
          unitId={unit.id}
          best={answers["speech:speaking"]?.score}
        />
      )}
      {unit.model_text && (
        <UnitShadow model={unit.model_text} unitId={unit.id} audio={audio} answers={answers} />
      )}
      {unit.passage && <UnitText text={unit.passage} part="passage" audio={audio} />}
      <UnitQuestions
        unitId={unit.id}
        title={t("questions")}
        part="questions"
        set="comprehension"
        questions={unit.comprehension}
        answers={answers}
      />
      {unit.context_text && <UnitText text={unit.context_text} part="context" audio={audio} />}
      {grammar && <UnitGrammar lesson={grammar} />}
      <UnitQuestions
        unitId={unit.id}
        title={t("tryIt")}
        part="controlled"
        set="controlled"
        hue="teal"
        questions={grammar?.controlled ?? []}
        answers={answers}
      />
      {grammar?.freer && (
        <p className="unit-panel rounded-2xl p-5" data-hue="amber">
          <Bi en={grammar.freer.en} ar={grammar.freer.ar} />
        </p>
      )}
      <UnitQuestions
        unitId={unit.id}
        title={t("practice")}
        part="practice"
        set="practice"
        hue="pink"
        from={(grammar?.controlled.length ?? 0) + 1}
        questions={unit.practice}
        answers={answers}
      />
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
          <UnitWriting
            unitId={unit.id}
            initial={writing}
            range={task.word_count}
            earlier={answers["writing:feedback"]?.detail}
          />
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
      <nav aria-label={t("unitNav")} className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/student/units/${strand}`}
          className="inline-flex min-h-11 items-center gap-1 rounded-full border-2 border-border bg-card px-5 font-semibold"
        >
          <ChevronLeft aria-hidden className="size-4 rtl:rotate-180" />
          {t("allUnits")}
        </Link>
        {next && (
          <Link
            href={`/student/units/${strand}/${next.id}`}
            data-next-unit={next.id}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground shadow-md"
          >
            {t("nextLesson")}
            <span className="text-sm font-normal opacity-90">
              {t("unitN", { n: next.unit })} · {next.title}
            </span>
            <ChevronRight aria-hidden className="size-5 rtl:rotate-180" />
          </Link>
        )}
      </nav>
    </>
  );
}
