import { getTranslations } from "next-intl/server";
import { headline, type ReportData } from "../types";
import { reportTables, suggestionLines, type T } from "../tables";

/** The full in-app report (SPEC §12: the source of truth; email and PDF are summaries/copies). */
export async function ReportView({ data, pdfHref }: { data: ReportData; pdfHref: string | null }) {
  const tr = await getTranslations("Reports");
  const t: T = (k, p) => tr(k as Parameters<typeof tr>[0], p);
  const h = headline(data);
  const tables = reportTables(data, t);
  const tiles: [string, string | number][] = [
    [t("mail.classes"), h.classes],
    [t("mail.students"), h.students],
    [t("mail.active"), `${h.activePct}%`],
    [t("mail.lessons"), h.lessons],
    [t("mail.atRisk"), h.atRisk],
  ];

  return (
    <div className="flex flex-col gap-6" data-report={data.period}>
      <p className="text-muted-foreground">
        {t("range", { school: data.school, start: data.start, end: data.end })}
      </p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-muted p-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {data.suggestions.length > 0 && (
        <section className="rounded-lg border-s-4 border-primary bg-card p-4">
          <h2 className="mb-2 font-semibold">{t("section.suggestions")}</h2>
          <ul className="list-inside list-disc text-sm">
            {suggestionLines(data, t).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}
      {tables.length === 0 && <p className="text-muted-foreground">{t("empty")}</p>}
      {tables.map((table) => (
        <section key={table.id} className="flex flex-col gap-2" data-section={table.id}>
          <h2 className="font-semibold">{table.title}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {table.headers.map((head, i) => (
                    <th key={i} scope="col" className="px-2 py-1 text-start font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {r.map((c, j) => (
                      <td key={j} className="px-2 py-1 tabular-nums">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {pdfHref && (
        <a
          href={pdfHref}
          className="self-start text-sm text-primary hover:underline print:hidden"
          data-pdf
        >
          📄 {t("pdfLink")}
        </a>
      )}
    </div>
  );
}
