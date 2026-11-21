import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Actor } from "@/lib/auth/session";
import { registryEntry } from "@/lib/registry";
import { widgets } from "@/widgets";

/** Renders a built widget, or a "coming in a later phase" card for planned ones. */
export async function WidgetSlot({ widgetKey, actor }: { widgetKey: string; actor: Actor }) {
  const Widget = widgets[widgetKey];
  if (Widget) return <Widget actor={actor} />;

  const t = await getTranslations("Registry");
  const tg = await getTranslations("Gates");
  const phase = registryEntry(widgetKey)?.phase;
  return (
    <Card data-widget={widgetKey} className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          {t(widgetKey)}
          <Badge variant="outline">{tg("comingSoon")}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {phase ? tg("plannedFor", { phase }) : tg("planned")}
      </CardContent>
    </Card>
  );
}
