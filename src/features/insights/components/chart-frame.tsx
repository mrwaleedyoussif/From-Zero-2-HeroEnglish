import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

export interface TableData {
  headers: string[];
  rows: (string | number | null)[][];
}

/**
 * Every chart (SPEC §11): a caption, the visual (hidden from screen readers, which get the
 * table instead), and the same data as a table behind "Show data" — also used for printing.
 */
export async function ChartFrame({
  title,
  summary,
  table,
  children,
  id,
}: {
  title: string;
  /** One sentence describing what the chart shows, read by screen readers. */
  summary: string;
  table: TableData;
  children: ReactNode;
  id: string;
}) {
  const t = await getTranslations("Insights");
  return (
    <figure className="flex flex-col gap-3" data-chart={id}>
      <figcaption className="font-medium">{title}</figcaption>
      <p className="sr-only">{summary}</p>
      <div aria-hidden className="print:hidden">
        {children}
      </div>
      <details className="text-sm" data-table={id}>
        <summary className="cursor-pointer text-primary print:hidden">{t("showData")}</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-start">
            <thead>
              <tr>
                {table.headers.map((h) => (
                  <th key={h} scope="col" className="border-b px-2 py-1 text-start font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  {r.map((c, j) => (
                    <td key={j} className="px-2 py-1 tabular-nums">
                      {c ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
