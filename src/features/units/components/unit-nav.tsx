import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { UnitCard } from "../queries";

/** Bottom of a unit: back to the list, and the next lesson once it is open. */
export async function UnitNav({ strand, next }: { strand: string; next?: UnitCard }) {
  const t = await getTranslations("Units");
  // STEP lessons carry their number in the title ("1.2 Nouns …").
  const name =
    next &&
    (/^\d\.\d /.test(next.title) ? next.title : `${t("unitN", { n: next.unit })} · ${next.title}`);
  return (
    <nav aria-label={t("unitNav")} className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href={`/student/units/${strand}`}
        className="inline-flex min-h-11 items-center gap-1 rounded-full border-2 border-border bg-card px-5 font-semibold"
      >
        <ChevronLeft aria-hidden className="size-4 rtl:rotate-180" />
        {t("allUnits")}
      </Link>
      {next && !next.locked && (
        <Link
          href={`/student/units/${strand}/${next.id}`}
          data-next-unit={next.id}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground shadow-md"
        >
          {t("nextLesson")}
          <span className="text-sm font-normal opacity-90">{name}</span>
          <ChevronRight aria-hidden className="size-5 rtl:rotate-180" />
        </Link>
      )}
      {next?.locked && (
        <p
          data-next-locked
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Lock aria-hidden className="size-4" />
          {t("finishToOpen")}
        </p>
      )}
    </nav>
  );
}
