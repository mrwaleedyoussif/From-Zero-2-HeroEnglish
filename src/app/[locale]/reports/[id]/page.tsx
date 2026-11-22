import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Toaster } from "@/components/ui/sonner";
import { SignedInHeader } from "@/features/auth/components/signed-in-header";
import { PrintButton } from "@/features/insights/components/print-button";
import { ReportView } from "@/features/reports/components/report-view";
import { getReport } from "@/features/reports/queries";
import { Link } from "@/i18n/navigation";
import { requireActor } from "@/lib/auth/guard";
import { formatDate } from "@/lib/i18n-names";

/** One report (linked from the digest email and the bell). RLS decides who may read it. */
export default async function ReportPage({ params }: PageProps<"/[locale]/reports/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const actor = await requireActor(locale);
  if (!z.guid().safeParse(id).success) notFound();
  const report = await getReport(id);
  if (!report) notFound();
  const t = await getTranslations("Reports");
  const lang = await getLocale();
  const period = report.period as "weekly" | "monthly";

  return (
    <div className="flex flex-1 flex-col">
      <SignedInHeader actor={actor} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
        <PageHeader
          title={t("pdfTitle", { period: t(`period.${period}`) })}
          description={t("forPerson", {
            name: report.profiles?.full_name ?? "",
            date: formatDate(report.created_at, lang),
          })}
        />
        <div className="flex gap-4 print:hidden">
          <Link href="/home" className="text-sm text-primary hover:underline">
            {t("back")}
          </Link>
          <PrintButton label={t("print")} />
        </div>
        <ReportView
          data={report.data}
          pdfHref={report.drive_file_id ? `/api/reports/${report.id}/pdf` : null}
        />
      </main>
      <Toaster />
    </div>
  );
}
