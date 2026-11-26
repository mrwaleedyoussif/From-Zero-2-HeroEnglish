import { getTranslations } from "next-intl/server";
import type { Attempt } from "../attempts";
import type { Mock } from "../schema";

/** After the exam: the score, each section, the score guide, then every question reviewed. */
export async function MockResult({ mock, attempt }: { mock: Mock; attempt: Attempt }) {
  const t = await getTranslations("Mocks");
  const score = attempt.score ?? 0;
  const total = (attempt.section_scores ?? []).reduce((a, s) => a + s.total, 0) || 100;
  const percent = Math.round((score / total) * 100);
  const guide = mock.guide.find((g) => percent >= g.min && percent <= g.max);
  return (
    <div className="flex flex-col gap-6" data-mock-result={score}>
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <p className="text-3xl font-extrabold">{t("score", { score, total })}</p>
        {guide && <p className="font-semibold">{guide.text}</p>}
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {(attempt.section_scores ?? []).map((s) => (
            <li key={s.n} className="rounded-xl border border-border bg-background p-3">
              <p className="text-sm text-muted-foreground">
                {mock.sections.find((x) => x.n === s.n)?.name}
              </p>
              <p className="text-xl font-bold" data-section-score={s.n}>
                {s.right} / {s.total}
              </p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">{t("guideNote")}</p>
      </section>
      {mock.sections.map((s) => (
        <details key={s.n} className="rounded-2xl border border-border bg-card p-5">
          <summary className="cursor-pointer text-lg font-bold">
            {t("review", { name: s.name })}
          </summary>
          {s.groups.map((g) => (
            <div key={g.id} className="mt-4 flex flex-col gap-3">
              {g.title && <h3 className="font-bold">{g.title}</h3>}
              {g.script && (
                <details>
                  <summary className="cursor-pointer font-semibold">{t("script")}</summary>
                  <ol dir="ltr" className="mt-2 flex flex-col gap-1 text-start text-sm">
                    {g.script.map((l, i) => (
                      <li key={i}>
                        <strong>{l.speaker}:</strong> {l.text}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              <ol className="flex flex-col gap-3">
                {g.questions.map((q) => {
                  const mine = attempt.answers[q.id];
                  const right = mine === q.answer;
                  return (
                    <li
                      key={q.id}
                      data-review={q.id}
                      data-right={right}
                      className="rounded-xl border border-border bg-background p-3 text-sm"
                    >
                      <p dir="ltr" className="text-start font-semibold whitespace-pre-line">
                        {q.n}. {q.stem}
                      </p>
                      <p dir="ltr" className="text-start">
                        {right ? "✓" : "✗"} {t("yours")}:{" "}
                        {mine ? `${mine.toUpperCase()}. ${q.options[mine] ?? ""}` : t("none")}
                        {!right && (
                          <strong>
                            {" "}
                            · {t("correct")}: {q.answer.toUpperCase()}. {q.options[q.answer]}
                          </strong>
                        )}
                      </p>
                      {q.explanation && (
                        <p className="text-muted-foreground">
                          {q.explanation.en}
                          {q.explanation.ar && (
                            <span lang="ar" dir="rtl" className="block">
                              {q.explanation.ar}
                            </span>
                          )}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </details>
      ))}
    </div>
  );
}
