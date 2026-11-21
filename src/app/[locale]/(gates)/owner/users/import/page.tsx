import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportWizard } from "@/features/users/import/import-wizard";
import { IMPORT_COLUMNS } from "@/features/users/import/parse";
import { requirePermission } from "@/lib/auth/guard";

export default async function ImportPage({ params }: PageProps<"/[locale]/owner/users/import">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "users:import");
  const t = await getTranslations("Import");

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>{t("format")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <code dir="ltr" className="block overflow-x-auto rounded bg-muted p-2 text-start">
            {IMPORT_COLUMNS.join(",")}
            <br />
            RIY01,student,sara.k,Sara K.,,4,4B,ar,yes
            <br />
            RIY01,teacher,,Mona Ali,mona@school.sa,4,4A,en,
          </code>
          <p className="text-muted-foreground">{t("formatHelp")}</p>
        </CardContent>
      </Card>
      {actor.viewAs ? <p>{t("readOnly")}</p> : <ImportWizard />}
    </>
  );
}
