import { ClipboardList } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { mockCards } from "@/features/mocks/list";
import { mayOpenStrand } from "@/features/units/queries";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";
import "@/features/units/components/units.css";

const HUES = { A: "green", B: "blue", C: "violet" } as Record<string, string>;

/** The 30 STEP mock exams in their three sets, with the learner's best score on each. */
export default async function MocksPage({ params }: PageProps<"/[locale]/student/step/mocks">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "learning:self", "page.student.mocks");
  if (!(await mayOpenStrand(actor, "SG"))) notFound();
  const t = await getTranslations("Mocks");
  const cards = await mockCards(actor.effective.id);
  const sets = [...new Set(cards.map((c) => c.set))];

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      {cards.length === 0 && <p className="text-muted-foreground">{t("noneYet")}</p>}
      {sets.map((set) => (
        <section
          key={set}
          data-set={set}
          data-hue={HUES[set] ?? "teal"}
          className="unit-panel flex flex-col gap-4 rounded-2xl p-5"
        >
          <h2 className="text-lg font-bold">{t(`set${set}`)}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {cards
              .filter((c) => c.set === set)
              .map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/student/step/mocks/${c.id}`}
                    data-mock={c.id}
                    className="unit-option flex min-h-20 items-center gap-3 rounded-xl p-3"
                  >
                    <ClipboardList aria-hidden className="size-6 shrink-0" />
                    <span className="flex flex-col">
                      <span className="font-semibold">{c.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {c.inProgress
                          ? t("underWay")
                          : c.best !== null
                            ? t("best", { n: c.best })
                            : t("notTaken")}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
