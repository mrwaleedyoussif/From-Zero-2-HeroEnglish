import { BookOpenCheck, ClipboardList, Ear, PenLine, Sigma } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { ProgressRing } from "@/components/progress-ring";
import { mayOpenStrand, strandUnits } from "@/features/units/queries";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";
import "@/features/units/components/units.css";

const BOOKLETS = [
  { strand: "SG", icon: Sigma, hue: "violet" },
  { strand: "SR", icon: BookOpenCheck, hue: "green" },
  { strand: "SL", icon: Ear, hue: "blue" },
  { strand: "SC", icon: PenLine, hue: "orange" },
] as const;

/** STEP Preparation: the four booklets (each opens lesson by lesson) and the mock exams. */
export default async function StepPage({ params }: PageProps<"/[locale]/student/step">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "learning:self", "page.student.step");
  if (!(await mayOpenStrand(actor, "SG"))) notFound();
  const t = await getTranslations("Step");
  const books = await Promise.all(
    BOOKLETS.map(async (b) => ({ ...b, units: await strandUnits(actor, b.strand) })),
  );

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      <ul className="grid gap-4 sm:grid-cols-2">
        {books.map(({ strand, icon: Icon, hue, units }) => {
          const done = units.filter((u) => u.done).length;
          return (
            <li key={strand}>
              <Link
                href={`/student/units/${strand}`}
                data-booklet={strand}
                data-hue={hue}
                className="unit-panel flex min-h-28 items-center gap-4 rounded-2xl p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span aria-hidden className="icon-tile size-12 rounded-xl">
                  <Icon className="size-6" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-lg font-bold">{t(`booklets.${strand}`)}</span>
                  <span className="text-sm text-muted-foreground">
                    {units.length
                      ? t("lessonsDone", { done, total: units.length })
                      : t("notLoaded")}
                  </span>
                </span>
                <ProgressRing
                  size={52}
                  value={units.length ? (done / units.length) * 100 : 0}
                  display={`${done}`}
                  label={t("lessonsDone", { done, total: units.length })}
                />
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/student/step/mocks"
            data-booklet="mocks"
            data-hue="teal"
            className="unit-panel flex min-h-28 items-center gap-4 rounded-2xl p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden className="icon-tile size-12 rounded-xl">
              <ClipboardList className="size-6" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-lg font-bold">{t("mocks")}</span>
              <span className="text-sm text-muted-foreground">{t("mocksHelp")}</span>
            </span>
          </Link>
        </li>
      </ul>
    </>
  );
}
