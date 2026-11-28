import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { HowTo } from "@/features/handwriting/components/how-to";
import { StrokeThumb } from "@/features/handwriting/components/stroke-thumb";
import { mayOpenHandwriting, STAGES, stepsFor } from "@/features/handwriting/queries";
import { PASS, starsOf } from "@/features/handwriting/strokes/grade";
import { isStyle } from "@/features/handwriting/types";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";
import "@/features/units/components/units.css";

/** One handwriting style: every step from letters to paragraphs, with the learner's stars. */
export default async function HandwritingStylePage({
  params,
}: PageProps<"/[locale]/student/handwriting/[style]">) {
  const { locale, style } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "learning:self", "page.student.handwriting");
  if (!isStyle(style) || !(await mayOpenHandwriting(actor, style))) notFound();
  const t = await getTranslations("Handwriting");
  const steps = await stepsFor(actor, style);
  const done = steps.filter((s) => (s.trace ?? 0) >= PASS && (s.write ?? 0) >= PASS).length;
  return (
    <>
      <PageHeader
        title={t(`styles.${style}`)}
        description={`${t(`styleHelp.${style}`)} ${t("progress", { done, total: steps.length })}`}
      />
      <HowTo style={style} sample="Hello" />
      {steps.length === 0 && <p className="text-muted-foreground">{t("none")}</p>}
      {STAGES.map((stage) => {
        const mine = steps.filter((s) => s.stage === stage);
        if (mine.length === 0) return null;
        const long = stage === "sentences" || stage === "paragraphs";
        return (
          <section key={stage} data-stage={stage} className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">{t(`stages.${stage}`)}</h2>
            <ul className={long ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}>
              {mine.map((s) => {
                const stars = starsOf(((s.trace ?? 0) + (s.write ?? 0)) / 2);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/student/handwriting/${style}/${s.id}`}
                      data-step={s.id}
                      data-hue={stars >= 2 ? "green" : "blue"}
                      aria-label={long ? undefined : s.text}
                      className={`unit-panel flex min-h-14 items-center gap-2 rounded-xl px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring ${long ? "" : "w-28 flex-col justify-center"}`}
                    >
                      {long ? (
                        <span dir="ltr" className="line-clamp-1 text-lg">
                          {s.text}
                        </span>
                      ) : (
                        <StrokeThumb style={style} text={s.text} />
                      )}
                      <span className="text-xs" aria-label={stars ? t("done") : t("notYet")}>
                        {"⭐".repeat(stars)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
