import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { latestAttempt, loadMock, sectionEnds } from "@/features/mocks/attempts";
import { MockExam } from "@/features/mocks/components/mock-exam";
import { MockResult } from "@/features/mocks/components/mock-result";
import { StartMock } from "@/features/mocks/components/start-mock";
import { mockAudio } from "@/features/mocks/list";
import { publicSection, questionsIn } from "@/features/mocks/schema";
import { mayOpenStrand } from "@/features/units/queries";
import { requirePermission } from "@/lib/auth/guard";

// Marking an exam reads and writes one row: well inside a request's time.
export const maxDuration = 30;

/** One mock exam: its instructions, the timed sitting section by section, then the result. */
export default async function MockPage({
  params,
}: PageProps<"/[locale]/student/step/mocks/[exam]">) {
  const { locale, exam } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "learning:self", "page.student.mocks");
  if (!(await mayOpenStrand(actor, "SG"))) notFound();
  const mock = await loadMock(exam);
  if (!mock) notFound();
  const t = await getTranslations("Mocks");
  const attempt = await latestAttempt(actor.effective.id, mock);
  const header = (
    <PageHeader
      title={`${mock.title} · ${t(`set${mock.set}`)}`}
      description={mock.band ? t("band", { band: mock.band }) : undefined}
    />
  );

  if (attempt && !attempt.finished_at) {
    const at = mock.sections.findIndex((s) => s.n === attempt.section);
    const section = mock.sections[at];
    if (!section) notFound();
    const tracks = section.groups.flatMap((g) => (g.track ? [g.track] : []));
    return (
      <>
        {header}
        <MockExam
          key={`${attempt.id}-${section.n}`}
          attemptId={attempt.id}
          section={publicSection(section)}
          place={t("place", { n: at + 1, total: mock.sections.length })}
          endsAt={sectionEnds(attempt, mock)}
          initial={attempt.answers}
          played={attempt.played}
          audio={await mockAudio(tracks)}
        />
      </>
    );
  }

  return (
    <>
      {header}
      {!attempt && (
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">{t("before")}</h2>
          <ul className="flex flex-col gap-2">
            {mock.sections.map((s) => (
              <li key={s.n} className="flex justify-between gap-3 border-b border-border pb-2">
                <span>{s.name}</span>
                <span className="font-semibold">
                  {t("sectionLine", { q: questionsIn(s).length, m: s.minutes })}
                </span>
              </li>
            ))}
          </ul>
          <ul className="flex list-disc flex-col gap-1 ps-5 text-sm">
            <li>{t("rule1")}</li>
            <li>{t("rule2")}</li>
            <li>{t("rule3")}</li>
          </ul>
          <StartMock examId={mock.id} />
        </section>
      )}
      {attempt?.finished_at && (
        <>
          <MockResult mock={mock} attempt={attempt} />
          <div>
            <StartMock examId={mock.id} again />
          </div>
        </>
      )}
    </>
  );
}
