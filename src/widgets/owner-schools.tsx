import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listSchools } from "@/features/schools/queries";
import { Link } from "@/i18n/navigation";
import { localName } from "@/lib/i18n-names";

export async function OwnerSchoolsWidget() {
  const t = await getTranslations("Registry");
  const tw = await getTranslations("Widgets");
  const locale = await getLocale();
  const schools = await listSchools();
  return (
    <Card data-widget="widget.owner.schools">
      <CardHeader>
        <CardTitle className="text-base">{t("widget.owner.schools")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1 text-sm">
          {schools.slice(0, 8).map((s) => (
            <li key={s.id} className="flex justify-between gap-2">
              <Link href={`/owner/schools/${s.id}`} className="text-primary hover:underline">
                {localName(s, locale)}
              </Link>
              <span className="text-muted-foreground">{tw("people", { count: s.people })}</span>
            </li>
          ))}
          {schools.length === 0 && <li className="text-muted-foreground">{tw("noSchools")}</li>}
        </ul>
      </CardContent>
    </Card>
  );
}
