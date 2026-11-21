import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CreateFoldersButton,
  DisconnectButton,
} from "@/features/integrations/components/create-folders-button";
import { googleRedirectUri } from "@/features/integrations/oauth";
import { requirePermission } from "@/lib/auth/guard";
import { serverEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/i18n-names";
import { googleConnection } from "@/lib/storage/secret";

const errors = [
  "forbidden",
  "not_configured",
  "state",
  "denied",
  "no_refresh_token",
  "scopes",
  "exchange",
] as const;

/** Connect the Owner's Google Drive (SPEC §5): OAuth once, refresh token stored encrypted. */
export default async function IntegrationsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/owner/integrations">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "integrations:manage", "page.owner.integrations");
  const t = await getTranslations("Integrations");
  const sp = await searchParams;
  const error = errors.find((e) => e === sp.error);
  const env = serverEnv();
  const configured = !!env.GOOGLE_OAUTH_CLIENT_ID && !!env.GOOGLE_OAUTH_CLIENT_SECRET;
  const connection = await googleConnection();
  const fake = env.STORAGE_DRIVER === "fake";
  const writable = !actor.viewAs;

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      {sp.connected && (
        <Alert role="status">
          <AlertDescription>{t("connectedNow")}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
        </Alert>
      )}
      {fake && (
        <Alert>
          <AlertDescription>{t("fakeDriver")}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Google Drive
            <Badge variant={connection.connected || fake ? "default" : "outline"}>
              {t(connection.connected || fake ? "statusConnected" : "statusNotConnected")}
            </Badge>
          </CardTitle>
          <CardDescription>{t("driveHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {connection.connected && (
            <p className="text-sm">
              {connection.source === "env"
                ? t("fromEnv")
                : t("connectedAs", {
                    email: connection.email ?? "—",
                    date: connection.connectedAt
                      ? formatDateTime(connection.connectedAt, locale)
                      : "—",
                  })}
            </p>
          )}
          {writable && (
            <div className="flex flex-wrap gap-2">
              {configured && (
                <Button asChild>
                  <a href={`/api/integrations/google/start?locale=${locale}`}>
                    {t(connection.connected ? "reconnect" : "connect")}
                  </a>
                </Button>
              )}
              {(connection.connected || fake) && <CreateFoldersButton />}
              {connection.source === "database" && <DisconnectButton />}
            </div>
          )}
        </CardContent>
      </Card>
      {!configured && (
        <Card>
          <CardHeader>
            <CardTitle>{t("setupTitle")}</CardTitle>
            <CardDescription>{t("setupIntro")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex list-decimal flex-col gap-2 ps-5 text-sm">
              {(["s1", "s2", "s3", "s4", "s5"] as const).map((s) => (
                <li key={s}>{t(`setup.${s}`)}</li>
              ))}
              <li>
                {t("setup.s6")}{" "}
                <code dir="ltr" className="rounded bg-muted px-1">
                  {googleRedirectUri(env.NEXT_PUBLIC_APP_URL, env.GOOGLE_OAUTH_REDIRECT_URI)}
                </code>
              </li>
              <li>{t("setup.s7")}</li>
            </ol>
          </CardContent>
        </Card>
      )}
    </>
  );
}
