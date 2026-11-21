import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { studentOverview } from "@/features/placement/queries";
import { Link } from "@/i18n/navigation";
import { localName } from "@/lib/i18n-names";
import type { WidgetProps } from ".";

/** Student home: current level per department, or a nudge to take / resume the placement test. */
export async function StudentPlacementCtaWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Registry");
  const tp = await getTranslations("Placement");
  const locale = await getLocale();
  const departments = await studentOverview(actor);
  const todo = departments.some((d) => d.placement?.ok || d.progress?.ok);

  return (
    <Card data-widget="widget.student.placementCta">
      <CardHeader>
        <CardTitle className="text-base">{t("widget.student.placementCta")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col gap-1 text-sm">
          {departments.map((d) => (
            <li key={d.code} className="flex justify-between gap-2">
              <span>{localName(d, locale)}</span>
              <span className="font-medium">{d.last?.cefr ?? tp("notTakenShort")}</span>
            </li>
          ))}
          {departments.length === 0 && <li className="text-muted-foreground">{tp("none")}</li>}
        </ul>
        <Button asChild variant={todo ? "default" : "outline"} className="self-start">
          <Link href="/student/placement">{todo ? tp("goTest") : tp("seeResults")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
