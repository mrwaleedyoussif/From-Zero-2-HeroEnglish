import { CircleCheck, Lock } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { ProgressRing } from "@/components/progress-ring";
import { CATALOG } from "@/features/departments/catalog";
import { mayOpenStrand, strandUnits } from "@/features/units/queries";
import { LEVELS } from "@/features/units/schema";
import { Link } from "@/i18n/navigation";
import { canSomewhere } from "@/lib/auth/can";
import { requirePermission } from "@/lib/auth/guard";

const STEP_BOOKLETS = ["SG", "SR", "SL", "SC"];
import "@/features/units/components/units.css";

const HUES = ["green", "teal", "blue", "violet", "pink", "rose", "orange", "amber"] as const;

/** A course's units, level by level, in the order their author gave them. */
export default async function UnitsPage({ params }: PageProps<"/[locale]/student/units/[strand]">) {
  const { locale, strand } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "learning:self", "page.student.units");
  if (!/^[A-Z]{1,8}$/.test(strand) || !(await mayOpenStrand(actor, strand))) notFound();
  const t = await getTranslations("Units");
  const td = await getTranslations("Departments");
  const ts = await getTranslations("Step");
  const department = Object.values(CATALOG)
    .flat()
    .find((d) => d.strand === strand);
  const units = await strandUnits(actor, strand);
  const done = units.filter((u) => u.done).length;
  const mayRecommend = !actor.viewAs && (await canSomewhere(actor, "lessons:assign"));

  return (
    <>
      <PageHeader
        title={
          STEP_BOOKLETS.includes(strand)
            ? `${td("names.step")} · ${ts(`booklets.${strand}`)}`
            : department
              ? td(`names.${department.key}`)
              : strand
        }
        description={t("listIntro", { done, total: units.length })}
      />
      {mayRecommend && (
        <p
          data-recommend-hint
          className="rounded-xl border border-border bg-muted px-4 py-3 text-sm font-semibold"
        >
          {t("recommend.hint")}
        </p>
      )}
      {units.length === 0 && <p className="text-muted-foreground">{t("none")}</p>}
      {LEVELS.filter((level) => units.some((u) => u.level === level)).map((level, i) => (
        <section
          key={level}
          data-level={level}
          data-hue={HUES[i % HUES.length]}
          className="unit-panel flex flex-col gap-4 rounded-2xl p-5"
        >
          <h2 className="flex items-center gap-3 text-lg font-bold">
            <span className="unit-chip rounded-full px-3 py-1 text-base font-extrabold">
              {level}
            </span>
            {t("level", { level })}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {units
              .filter((u) => u.level === level)
              .map((u) => (
                <li key={u.id}>
                  {u.locked ? (
                    <div
                      data-unit={u.id}
                      data-locked
                      className="unit-option flex min-h-20 items-center gap-3 rounded-xl p-3 opacity-60"
                    >
                      <span className="unit-chip flex size-[52px] shrink-0 items-center justify-center rounded-full">
                        <Lock aria-hidden className="size-5" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-semibold">{u.title}</span>
                        <span className="text-sm text-muted-foreground">{t("lockedHint")}</span>
                      </span>
                      <span className="sr-only">{t("locked")}</span>
                    </div>
                  ) : (
                    <Link
                      href={`/student/units/${strand}/${u.id}`}
                      data-unit={u.id}
                      className="unit-option flex min-h-20 items-center gap-3 rounded-xl p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ProgressRing
                        size={52}
                        value={u.total ? (u.correct / u.total) * 100 : u.done ? 100 : 0}
                        display={u.total ? `${u.correct}/${u.total}` : String(u.unit)}
                        label={t("unitN", { n: u.unit })}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-semibold">{u.title}</span>
                        {u.title_ar && (
                          <span lang="ar" dir="rtl" className="text-sm text-muted-foreground">
                            {u.title_ar}
                          </span>
                        )}
                        {u.recommended && (
                          <span
                            data-recommended-unit
                            className="unit-chip mt-1 self-start rounded-full px-2 text-xs font-bold"
                          >
                            ⭐ {t("recommend.badge")}
                          </span>
                        )}
                      </span>
                      {u.done && (
                        <CircleCheck
                          aria-label={t("done")}
                          className="size-6 shrink-0 text-success"
                        />
                      )}
                    </Link>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
