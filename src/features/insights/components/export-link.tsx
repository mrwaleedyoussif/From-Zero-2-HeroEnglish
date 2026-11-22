import { getTranslations } from "next-intl/server";
import { PrintButton } from "./print-button";

/** "Download CSV" for the table on screen, and "Print / save as PDF" for the dashboard. */
export async function ExportLink({
  dataset,
  params,
}: {
  dataset: "classes" | "students" | "teachers" | "coaching";
  params: Record<string, string>;
}) {
  const t = await getTranslations("Insights");
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return (
    <span className="flex items-center gap-3 print:hidden">
      <a
        href={`/api/export/${dataset}${qs ? `?${qs}` : ""}`}
        className="text-sm text-primary hover:underline"
        data-export={dataset}
      >
        ⬇ {t("csv")}
      </a>
      <PrintButton label={t("pdf")} />
    </span>
  );
}
