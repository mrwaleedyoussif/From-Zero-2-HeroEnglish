import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ResultCard } from "@/features/placement/components/result-card";
import { sessionResult } from "@/features/placement/results";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";

export default async function ResultPage({
  params,
}: PageProps<"/[locale]/student/placement/[session]/result">) {
  const { locale, session } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "placement:take", "page.student.placement");
  if (!z.guid().safeParse(session).success) notFound();
  const result = await sessionResult(session);
  if (!result || result.session.student_id !== actor.effective.id || !result.session.completed_at)
    notFound();
  const t = await getTranslations("Placement");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title={t("resultTitle")} description={t("resultIntro")} />
      <ResultCard result={result} />
      <Button asChild variant="outline" className="self-start">
        <Link href="/student/placement">{t("back")}</Link>
      </Button>
    </div>
  );
}
