import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/i18n-names";
import { createClient } from "@/lib/supabase/server";

/** Latest changes the viewer may see (RLS: audit:view). */
export async function OwnerAuditLogWidget() {
  const t = await getTranslations("Registry");
  const tw = await getTranslations("Widgets");
  const locale = await getLocale();
  const db = await createClient();
  const { data } = await db
    .from("audit_log")
    .select("id, action, target_table, created_at")
    .order("created_at", { ascending: false })
    .limit(6);
  return (
    <Card data-widget="widget.owner.auditLog">
      <CardHeader>
        <CardTitle className="text-base">{t("widget.owner.auditLog")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <ul className="flex flex-col gap-1 text-sm">
          {(data ?? []).map((r) => (
            <li key={r.id} className="flex justify-between gap-2">
              <code dir="ltr" className="text-xs">
                {r.target_table}.{r.action}
              </code>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(r.created_at, locale)}
              </span>
            </li>
          ))}
          {(data ?? []).length === 0 && (
            <li className="text-muted-foreground">{tw("nothingYet")}</li>
          )}
        </ul>
        <Link href="/owner/audit" className="text-sm text-primary hover:underline">
          {tw("openAudit")}
        </Link>
      </CardContent>
    </Card>
  );
}
