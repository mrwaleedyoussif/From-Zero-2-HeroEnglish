import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, TextField } from "@/components/field";
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
import { createSchool } from "@/features/schools/actions";
import { listSchools } from "@/features/schools/queries";
import { Link } from "@/i18n/navigation";
import { can } from "@/lib/auth/can";
import { requirePermission } from "@/lib/auth/guard";
import { platformTarget } from "@/lib/auth/scope";
import { localName } from "@/lib/i18n-names";

export default async function SchoolsPage({ params }: PageProps<"/[locale]/owner/schools">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "schools:view");
  const t = await getTranslations("Schools");
  const schools = await listSchools();
  const canCreate = !actor.viewAs && (await can(actor, "schools:manage", platformTarget));

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("code")}</TableHead>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("people")}</TableHead>
            <TableHead>{t("status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schools.map((s) => (
            <TableRow key={s.id}>
              <TableCell dir="ltr" className="font-mono">
                {s.code}
              </TableCell>
              <TableCell>
                <Link
                  href={`/owner/schools/${s.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {localName(s, locale)}
                </Link>
              </TableCell>
              <TableCell>{s.people}</TableCell>
              <TableCell>{t(`statuses.${s.status}`)}</TableCell>
            </TableRow>
          ))}
          {schools.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                {t("empty")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>{t("add")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={createSchool}>
              <FormRow>
                <TextField
                  label={t("code")}
                  name="code"
                  required
                  dir="ltr"
                  placeholder="RIY01"
                  className="w-32"
                />
                <TextField label={t("nameEn")} name="name_en" required dir="ltr" />
                <TextField label={t("nameAr")} name="name_ar" required dir="rtl" />
                <TextField
                  label={t("timezone")}
                  name="timezone"
                  defaultValue="Asia/Riyadh"
                  dir="ltr"
                />
                <Button type="submit">{t("add")}</Button>
              </FormRow>
            </ActionForm>
          </CardContent>
        </Card>
      )}
    </>
  );
}
