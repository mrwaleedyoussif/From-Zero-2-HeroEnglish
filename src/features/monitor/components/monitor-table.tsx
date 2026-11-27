import { getLocale, getTranslations } from "next-intl/server";
import { isOnline } from "@/features/presence/queries";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/i18n-names";
import type { MonitorRow } from "../queries";

const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

/** The class (or group) at a glance: a line per student, each name opening that student. */
export async function MonitorTable({
  rows,
  here,
  chosen,
}: {
  rows: MonitorRow[];
  here: string;
  chosen?: string;
}) {
  const t = await getTranslations("Monitor");
  const locale = await getLocale();
  const online = rows.filter((r) => isOnline(r.seenAt)).length;
  if (rows.length === 0) return <p className="text-muted-foreground">{t("noStudents")}</p>;
  return (
    <section className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground" data-monitor-online={online}>
        {t("summary", { students: rows.length, online })}
      </p>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-muted text-start">
            <tr>
              {(
                [
                  "student",
                  "seen",
                  "units",
                  "accuracy",
                  "speaking",
                  "mocks",
                  "handwriting",
                ] as const
              ).map((k) => (
                <th key={k} scope="col" className="px-3 py-2 text-start font-semibold">
                  {t(`col.${k}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const on = isOnline(r.seenAt);
              return (
                <tr
                  key={r.id}
                  data-student={r.id}
                  className={`border-t border-border ${r.id === chosen ? "bg-primary/10" : ""}`}
                >
                  <th scope="row" className="px-3 py-2 text-start">
                    <Link href={`${here}&student=${r.id}`} className="font-semibold underline">
                      {r.name}
                    </Link>
                  </th>
                  <td className="px-3 py-2" data-online={on}>
                    <span
                      aria-hidden
                      className={`me-1.5 inline-block size-2.5 rounded-full ${on ? "bg-success" : "bg-muted-foreground/40"}`}
                    />
                    {on ? t("online") : r.seenAt ? formatDateTime(r.seenAt, locale) : t("never")}
                  </td>
                  <td className="px-3 py-2">
                    {t("unitsDone", { done: r.finished, started: r.started })}
                  </td>
                  <td className="px-3 py-2">{pct(r.accuracy)}</td>
                  <td className="px-3 py-2">{pct(r.speaking)}</td>
                  <td className="px-3 py-2">
                    {r.mockBest === null ? "—" : t("mockBest", { best: r.mockBest, n: r.mocks })}
                  </td>
                  <td className="px-3 py-2">
                    {r.handwriting === null
                      ? "—"
                      : t("handDone", { avg: r.handwriting, n: r.handwritingSteps })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
