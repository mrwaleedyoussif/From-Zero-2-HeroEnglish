import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

/** Card shell shared by dashboard widgets: registry label as title, optional "Open" link. */
export async function WidgetCard({
  widgetKey,
  href,
  children,
  wide,
}: {
  widgetKey: string;
  href?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const t = await getTranslations("Registry");
  const ti = await getTranslations("Insights");
  return (
    <Card data-widget={widgetKey} className={wide ? "md:col-span-2" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{t(widgetKey)}</CardTitle>
        {href && (
          <Link href={href} className="text-sm text-primary hover:underline print:hidden">
            {ti("open")}
          </Link>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}
