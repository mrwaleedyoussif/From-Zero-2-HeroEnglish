import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";

/** Shown instead of a unit the learner has not reached yet. */
export async function UnitLocked({
  strand,
  unit,
  title,
}: {
  strand: string;
  unit: number;
  title: string;
}) {
  const t = await getTranslations("Units");
  return (
    <>
      <PageHeader title={`${t("unitN", { n: unit })} · ${title}`} />
      <section
        data-unit-locked
        data-hue="amber"
        className="unit-panel flex flex-col items-start gap-3 rounded-2xl p-6"
      >
        <span aria-hidden className="icon-tile size-12 rounded-xl">
          <Lock className="size-6" />
        </span>
        <h2 className="text-lg font-bold">{t("lockedTitle")}</h2>
        <p>{t("lockedBody")}</p>
        <Link
          href={`/student/units/${strand}`}
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground"
        >
          {t("toList")}
        </Link>
      </section>
    </>
  );
}
