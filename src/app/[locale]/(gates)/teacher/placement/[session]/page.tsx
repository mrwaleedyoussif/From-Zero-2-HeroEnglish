import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResultCard } from "@/features/placement/components/result-card";
import { ScoreForm } from "@/features/placement/components/score-form";
import { sessionResult } from "@/features/placement/results";
import { productiveRubric } from "@/features/placement/teacher/queries";
import { Link } from "@/i18n/navigation";
import { can } from "@/lib/auth/can";
import { requirePermission } from "@/lib/auth/guard";

/** Session detail for staff: result, θ/SE path, every answer with its time, writing/speaking scoring. */
export default async function TeacherSessionPage({
  params,
}: PageProps<"/[locale]/teacher/placement/[session]">) {
  const { locale, session } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "placement:view_results", "page.teacher.placement");
  if (!z.guid().safeParse(session).success) notFound();
  const result = await sessionResult(session);
  if (!result) notFound();
  const t = await getTranslations("TeacherPlacement");
  const s = result.session;
  const mayScore = await can(actor, "placement:score", { userId: s.student_id });
  const rubric = mayScore ? await productiveRubric() : null;
  const seconds = (ms: number | null) => (ms === null ? "—" : (ms / 1000).toFixed(1));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={s.profiles?.full_name ?? ""}
        description={t("detailIntro", { switches: s.tab_switches ?? 0, items: s.items_count ?? 0 })}
      />
      {s.completed_at && <ResultCard result={result} />}

      {result.submissions.map((sub) => (
        <Card key={sub.id} data-submission={sub.kind}>
          <CardHeader>
            <CardTitle>{t(sub.kind === "writing" ? "writing" : "speaking")}</CardTitle>
            <p className="text-sm text-muted-foreground">{sub.items?.stem}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {sub.kind === "writing" ? (
              <p className="rounded-md bg-muted p-3 whitespace-pre-wrap">{sub.body}</p>
            ) : (
              <audio controls preload="none" src={`/api/uploads/${sub.id}`} className="w-full" />
            )}
            {sub.status === "scored" ? (
              <p className="text-sm">
                {t("scored", { cefr: sub.submission_scores?.cefr ?? "—" })}
                {sub.submission_scores?.comment ? ` — ${sub.submission_scores.comment}` : ""}
              </p>
            ) : mayScore && !actor.viewAs ? (
              <ScoreForm submissionId={sub.id} rubric={rubric} />
            ) : (
              <p className="text-sm text-muted-foreground">{t("notScored")}</p>
            )}
          </CardContent>
        </Card>
      ))}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("path")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>{t("item")}</TableHead>
              <TableHead>{t("correct")}</TableHead>
              <TableHead>{t("seconds")}</TableHead>
              <TableHead>b</TableHead>
              <TableHead>θ</TableHead>
              <TableHead>SE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.responses.map((r) => (
              <TableRow key={r.seq}>
                <TableCell>{r.seq}</TableCell>
                <TableCell dir="ltr">{r.items?.code}</TableCell>
                <TableCell>{r.correct ? "✓" : "✗"}</TableCell>
                <TableCell>{seconds(r.time_ms)}</TableCell>
                <TableCell>{Number(r.b_used).toFixed(2)}</TableCell>
                <TableCell>{Number(r.theta_after).toFixed(2)}</TableCell>
                <TableCell>{Number(r.se_after).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <Button asChild variant="outline" className="self-start">
        <Link href="/teacher/placement">{t("back")}</Link>
      </Button>
    </div>
  );
}
