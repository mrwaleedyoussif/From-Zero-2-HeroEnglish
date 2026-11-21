import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, SelectField, TextField } from "@/components/field";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { grantRetake, openWindow } from "@/features/placement/teacher/actions";
import { classResults, pendingScoring, windowOptions } from "@/features/placement/teacher/queries";
import { Link } from "@/i18n/navigation";
import { can } from "@/lib/auth/can";
import { requirePermission } from "@/lib/auth/guard";
import { formatDate, localName } from "@/lib/i18n-names";

/** Teacher placement: class results, scoring queue, retakes and progress checks (SPEC §7). */
export default async function TeacherPlacementPage({
  params,
}: PageProps<"/[locale]/teacher/placement">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "placement:view_results", "page.teacher.placement");
  const t = await getTranslations("TeacherPlacement");
  const [rows, queue, windows] = await Promise.all([
    classResults(),
    pendingScoring(),
    windowOptions(actor),
  ]);
  const students = [...new Set(rows.map((r) => r.student_id))];
  const retakeOk = new Set(
    actor.viewAs
      ? []
      : (
          await Promise.all(
            students.map(async (id) =>
              (await can(actor, "placement:retake", { userId: id })) ? id : null,
            ),
          )
        ).filter((x) => x !== null),
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} description={t("intro")} />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("queue")}</h2>
        {queue.length === 0 && <p className="text-muted-foreground">{t("queueEmpty")}</p>}
        <ul className="flex flex-col gap-1">
          {queue.map((q) => (
            <li key={q.id}>
              <Link className="underline" href={`/teacher/placement/${q.session_id}`}>
                {q.profiles?.full_name} · {t(q.kind === "writing" ? "writing" : "speaking")} ·{" "}
                {formatDate(q.created_at, locale)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("results")}</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t("noResults")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("student")}</TableHead>
                <TableHead>{t("department")}</TableHead>
                <TableHead>{t("kind")}</TableHead>
                <TableHead>CEFR</TableHead>
                <TableHead>{t("score")}</TableHead>
                <TableHead>{t("leftPage")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} data-student={r.profiles?.username ?? ""}>
                  <TableCell>
                    <Link className="underline" href={`/teacher/placement/${r.id}`}>
                      {r.profiles?.full_name}
                    </Link>
                  </TableCell>
                  <TableCell>{r.departments ? localName(r.departments, locale) : ""}</TableCell>
                  <TableCell>{t(r.kind === "progress" ? "progress" : "placement")}</TableCell>
                  <TableCell>{r.cefr ?? t(`status.${r.status}`)}</TableCell>
                  <TableCell>{r.scaled_score ?? "—"}</TableCell>
                  <TableCell>{r.tab_switches}</TableCell>
                  <TableCell>{formatDate(r.completed_at ?? r.started_at, locale)}</TableCell>
                  <TableCell>
                    {r.kind === "placement" && r.completed_at && retakeOk.has(r.student_id) && (
                      <ActionForm action={grantRetake} successMessage="retakeGranted">
                        <input type="hidden" name="student_id" value={r.student_id} />
                        <input type="hidden" name="department_id" value={r.department_id} />
                        <Button type="submit" size="sm" variant="outline">
                          {t("grantRetake")}
                        </Button>
                      </ActionForm>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {windows.classes.length > 0 && !actor.viewAs && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("progressTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("progressIntro")}</p>
          <ActionForm action={openWindow} successMessage="windowOpened">
            <FormRow>
              <SelectField
                idPrefix="win"
                label={t("class")}
                name="class_id"
                required
                options={windows.classes.map((c) => ({ value: c.id, label: c.code }))}
              />
              <SelectField
                idPrefix="win"
                label={t("department")}
                name="department_id"
                required
                options={windows.departments.map((d) => ({
                  value: d.id,
                  label: localName(d, locale),
                }))}
              />
              <TextField
                idPrefix="win"
                label={t("closesOn")}
                name="closes_on"
                type="date"
                required
              />
              <Button type="submit">{t("openWindow")}</Button>
            </FormRow>
          </ActionForm>
          <ul className="text-sm">
            {windows.open.map((w) => (
              <li key={w.id}>
                {t("openUntil", {
                  cls: w.classes?.code ?? "",
                  dept: w.departments?.code ?? "",
                  date: formatDate(w.closes_at, locale),
                })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
