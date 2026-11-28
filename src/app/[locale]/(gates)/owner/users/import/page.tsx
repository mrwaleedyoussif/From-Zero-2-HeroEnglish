import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportWizard } from "@/features/users/import/import-wizard";
import { IMPORT_COLUMNS } from "@/features/users/import/parse";
import { requirePermission } from "@/lib/auth/guard";

export default async function ImportPage({ params }: PageProps<"/[locale]/owner/users/import">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "users:import", "page.owner.import");
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
            Riyadh Demo School,RIY01,Sara Khalid,student,4B
            <br />
            Riyadh Demo School,RIY01,Mona Ali,teacher,4B
            <br />
            Riyadh Demo School,RIY01,Huda Saleh,vice principal,
          </code>
          <p className="text-muted-foreground">{t("formatHelp")}</p>
        </CardContent>
      </Card>
      {actor.viewAs ? <p>{t("readOnly")}</p> : <ImportWizard />}
    </>
  );
}
