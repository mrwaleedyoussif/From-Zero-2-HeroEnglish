import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Practice } from "@/features/handwriting/components/practice";
import { isStyle } from "@/features/handwriting/types";
import { mayOpenHandwriting, stepsFor } from "@/features/handwriting/queries";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";

/** One handwriting step: watch, trace, write, check; then on to the next. */
export default async function HandwritingStepPage({
  params,
}: PageProps<"/[locale]/student/handwriting/[style]/[step]">) {
  const { locale, style, step } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "learning:self", "page.student.handwriting");
  if (!isStyle(style) || !(await mayOpenHandwriting(actor, style))) notFound();
  const t = await getTranslations("Handwriting");
  const steps = await stepsFor(actor, style);
  const at = steps.findIndex((s) => s.id === step);
  const here = steps[at];
  if (!here) notFound();
  const next = steps[at + 1];
  const link =
    "inline-flex min-h-11 items-center rounded-full border-2 border-border px-4 font-semibold";
  return (
    <>
      <PageHeader
        title={`${t(`styles.${style}`)} · ${t(`stages.${here.stage}`)}`}
        description={t("stepOf", { n: at + 1, total: steps.length })}
      />
      <Practice
        key={here.id}
        step={here.id}
        style={style}
        text={here.text}
        best={{ trace: here.trace, write: here.write }}
      />
      <nav className="flex flex-wrap gap-2">
        <Link href={`/student/handwriting/${style}`} className={link}>
          {t("back")}
        </Link>
        {next && (
          <Link
            href={`/student/handwriting/${style}/${next.id}`}
            data-next-step
            className={`${link} border-primary bg-primary text-primary-foreground`}
          >
            {t("next")}
          </Link>
        )}
      </nav>
    </>
  );
}
