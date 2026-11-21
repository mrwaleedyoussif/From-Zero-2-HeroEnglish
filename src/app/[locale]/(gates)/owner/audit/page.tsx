import { getTranslations, setRequestLocale } from "next-intl/server";
import { FormRow, SelectField } from "@/components/field";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/guard";
import { formatDateTime } from "@/lib/i18n-names";
import { createClient } from "@/lib/supabase/server";

const tables = [
  "user_roles",
  "user_permission_overrides",
  "role_permissions",
  "roles",
  "supervision_links",
  "schools",
  "grades",
  "classes",
  "profiles",
] as const;

/** Latest 200 audit entries the viewer may see (RLS: audit:view in that school, or platform). */
export default async function AuditPage({
  params,
  searchParams,
}: PageProps<"/[locale]/owner/audit">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "audit:view");
  const t = await getTranslations("Audit");
  const requested = (await searchParams).table;
  const table = tables.find((x) => x === requested);
  const db = await createClient();
  let query = db
    .from("audit_log")
    .select("id, action, target_table, target_id, created_at, before, after, actor_id")
    .order("created_at", { ascending: false })
    .limit(200);
  if (table) query = query.eq("target_table", table);
  const { data: rows } = await query;
  const actorIds = [...new Set((rows ?? []).flatMap((r) => (r.actor_id ? [r.actor_id] : [])))];
  const { data: actors } = await db
    .from("profiles")
    .select("id, full_name")
    .in("id", actorIds.length ? actorIds : ["00000000-0000-0000-0000-000000000000"]);
  const actorName = new Map((actors ?? []).map((a) => [a.id, a.full_name]));

  const summary = (r: NonNullable<typeof rows>[number]) => {
    const row = (r.after ?? r.before) as Record<string, unknown> | null;
    if (!row) return "";
    const pick = ["permission_key", "key", "code", "effect", "scope_type", "status", "kind"]
      .flatMap((k) =>
        row[k] != null && typeof row[k] !== "object" ? [`${k}=${String(row[k])}`] : [],
      )
      .slice(0, 4);
    return pick.join(" ");
  };

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      <form method="get" className="contents">
        <FormRow>
          <SelectField
            label={t("table")}
            name="table"
            defaultValue={table ?? ""}
            placeholder={t("all")}
            options={tables.map((x) => ({ value: x, label: x }))}
          />
          <Button type="submit" variant="secondary">
            {t("filter")}
          </Button>
        </FormRow>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("when")}</TableHead>
            <TableHead>{t("who")}</TableHead>
            <TableHead>{t("action")}</TableHead>
            <TableHead>{t("what")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(rows ?? []).map((r) => (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap">
                {formatDateTime(r.created_at, locale)}
              </TableCell>
              <TableCell>
                {r.actor_id ? (actorName.get(r.actor_id) ?? r.actor_id.slice(0, 8)) : t("system")}
              </TableCell>
              <TableCell dir="ltr" className="text-start font-mono text-xs">
                {r.target_table}.{r.action}
              </TableCell>
              <TableCell dir="ltr" className="text-start font-mono text-xs">
                {summary(r)}
              </TableCell>
            </TableRow>
          ))}
          {(rows ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                {t("empty")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
