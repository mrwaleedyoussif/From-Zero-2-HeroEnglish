import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
import { ColourPicker, ResetColour } from "@/features/schools/components/colour-picker";
import { GradesCard, NewClassForm, YearsCard } from "@/features/schools/components/structure-cards";
import { getSchool } from "@/features/schools/queries";
import { Link } from "@/i18n/navigation";
import { can } from "@/lib/auth/can";
import { requirePermission } from "@/lib/auth/guard";
import { schoolTarget } from "@/lib/auth/scope";
import { localName } from "@/lib/i18n-names";

export default async function SchoolPage({ params }: PageProps<"/[locale]/owner/schools/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "schools:view", "page.owner.schools");
  const detail = await getSchool(id);
  if (!detail) notFound();
  const t = await getTranslations("Schools");
  const canEdit = !actor.viewAs && (await can(actor, "classes:manage", schoolTarget(id)));
  const canCards = await can(actor, "users:reset_pin", schoolTarget(id));
  const canTheme = !actor.viewAs && (await can(actor, "schools:manage", schoolTarget(id)));
  const tt = await getTranslations("SchoolTheme");
  const primary = (detail.school.theme as { primary?: string } | null)?.primary ?? null;
  const gradeName = new Map(detail.grades.map((g) => [g.id, localName(g, locale)]));

  return (
    <>
      <PageHeader
        title={localName(detail.school, locale)}
        description={`${detail.school.code} · ${detail.school.timezone}`}
        actions={
          <Button asChild variant="outline">
            <Link href={{ pathname: "/owner/users", query: { school: id } }}>
              {t("peopleLink")}
            </Link>
          </Button>
        }
      />
      {canTheme && (
        <Card>
          <CardHeader>
            <CardTitle>{tt("title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">{tt("help")}</p>
            <ColourPicker schoolId={id} current={primary} />
            {primary && <ResetColour schoolId={id} />}
          </CardContent>
        </Card>
      )}
      <YearsCard detail={detail} canEdit={canEdit} />
      <GradesCard detail={detail} canEdit={canEdit} />
      <Card>
        <CardHeader>
          <CardTitle>{t("classes")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("classCode")}</TableHead>
                <TableHead>{t("grade")}</TableHead>
                <TableHead>{t("students")}</TableHead>
                <TableHead>{t("teachers")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.classes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell dir="ltr" className="font-mono">
                    {c.code}
                  </TableCell>
                  <TableCell>{gradeName.get(c.grade_id)}</TableCell>
                  <TableCell>{c.students}</TableCell>
                  <TableCell>{c.teachers.join(", ") || "—"}</TableCell>
                  <TableCell className="text-end">
                    {canCards && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/owner/classes/${c.id}/cards`}>{t("loginCards")}</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {canEdit && detail.grades.length > 0 && detail.years.length > 0 && (
            <NewClassForm detail={detail} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
