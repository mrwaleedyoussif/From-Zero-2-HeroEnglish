import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UnitsImport } from "@/features/units/components/units-import";
import { ContentSync } from "@/features/content/components/content-sync";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { serverEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/i18n-names";
import { googleConnection } from "@/lib/storage/secret";
import { createClient } from "@/lib/supabase/server";

/** Content sync from Google Sheets (SPEC §6) + recent import history. */
export default async function ContentPage({ params }: PageProps<"/[locale]/owner/content">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "content:import", "page.owner.content");
  const t = await getTranslations("ContentSync");
  const db = await createClient();
  const [jobs, counts, connection] = await Promise.all([
    db
      .from("import_jobs")
      .select("id, status, created_at, applied_at")
      .order("created_at", { ascending: false })
      .limit(5),
    Promise.all(
      (["departments", "items", "lessons", "media_assets"] as const).map(async (table) => {
        const { count } = await db.from(table).select("id", { count: "exact", head: true });
        return [table, count ?? 0] as const;
      }),
    ),
    googleConnection(),
  ]);
  const tu = await getTranslations("Units");
  const units = await db.from("course_units").select("id", { count: "exact", head: true });
  const ready = connection.connected || serverEnv().STORAGE_DRIVER === "fake";

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("syncTitle")}</CardTitle>
          <CardDescription>{t("syncHelp")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <p className="text-sm">
              {t("connectFirst")}{" "}
              <Link href="/owner/integrations" className="text-primary underline">
                {t("goToIntegrations")}
              </Link>
            </p>
          ) : actor.viewAs ? (
            <p>{t("readOnly")}</p>
          ) : (
            <ContentSync />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{tu("importTitle")}</CardTitle>
          <CardDescription>{tu("importHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm font-medium" data-count="course_units">
            {tu("loaded", { n: units.count ?? 0 })}
          </p>
          {ready && !actor.viewAs && <UnitsImport />}
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("inLibrary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-1 text-sm">
              {counts.map(([table, n]) => (
                <div key={table} className="contents">
                  <dt className="text-muted-foreground">{t(`counts.${table}`)}</dt>
                  <dd className="font-semibold" data-count={table}>
                    {n}
                  </dd>
                </div>
              ))}
            </dl>
            <Button asChild variant="link" className="px-0">
              <Link href="/teacher/library">{t("openLibrary")}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("history")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1 text-sm">
              {(jobs.data ?? []).map((j) => (
                <li key={j.id} className="flex justify-between gap-2">
                  <span>{formatDateTime(j.applied_at ?? j.created_at, locale)}</span>
                  <Badge
                    variant={
                      j.status === "applied"
                        ? "default"
                        : j.status === "failed"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {t(`statuses.${j.status}`)}
                  </Badge>
                </li>
              ))}
              {(jobs.data ?? []).length === 0 && (
                <li className="text-muted-foreground">{t("noHistory")}</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
