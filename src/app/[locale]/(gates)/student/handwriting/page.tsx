import { PenLine, Signature } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { HowTo } from "@/features/handwriting/components/how-to";
import { STYLES } from "@/features/handwriting/types";
import { mayOpenHandwriting } from "@/features/handwriting/queries";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";
import "@/features/units/components/units.css";

/** Handwriting: choose print letters or a joined hand; a short demonstration shows the way. */
export default async function HandwritingPage({
  params,
}: PageProps<"/[locale]/student/handwriting">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "learning:self", "page.student.handwriting");
  const t = await getTranslations("Handwriting");
  const open = (
    await Promise.all(STYLES.map(async (s) => ((await mayOpenHandwriting(actor, s)) ? s : null)))
  ).filter((s) => s !== null);
  const first = open[0];
  if (!first) notFound();
  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      <HowTo style={first} sample="Hello" />
      <ul className="grid gap-4 sm:grid-cols-2">
        {open.map((s) => {
          const Icon = s === "print" ? PenLine : Signature;
          return (
            <li key={s}>
              <Link
                href={`/student/handwriting/${s}`}
                data-style={s}
                data-hue={s === "print" ? "cyan" : "slate"}
                className="unit-panel flex min-h-28 items-center gap-4 rounded-2xl p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span aria-hidden className="icon-tile size-12 rounded-xl">
                  <Icon className="size-6" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-lg font-bold">{t(`styles.${s}`)}</span>
                  <span className="text-sm text-muted-foreground">{t(`styleHelp.${s}`)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
