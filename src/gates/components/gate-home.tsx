import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { requireActor } from "@/lib/auth/guard";
import { requireVisible, visibleOnly } from "@/lib/visibility/server";
import type { GateConfig } from "../types";
import { WidgetSlot } from "./widget-slot";

/** Gate home dashboard: the config's widgets the user may see (SPEC §11). */
export async function GateHome({
  gate,
  params,
}: {
  gate: GateConfig;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requireActor(locale);
  await requireVisible(actor, `page.${gate.key}.home`);
  const t = await getTranslations("Registry");
  const tg = await getTranslations("Gates");
  const widgets = await visibleOnly(actor, gate.homeWidgets, (k) => k);

  return (
    <>
      <PageHeader
        title={t(`gate.${gate.key}`)}
        description={tg("welcome", { name: actor.effective.full_name })}
      />
      {widgets.length === 0 && <p className="text-muted-foreground">{tg("noWidgets")}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {widgets.map((key) => (
          <WidgetSlot key={key} widgetKey={key} actor={actor} />
        ))}
      </div>
    </>
  );
}
