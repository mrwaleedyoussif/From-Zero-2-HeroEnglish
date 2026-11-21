import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resetPin, setUserStatus } from "../actions";
import type { UserDetail } from "../queries";
import { startViewAs } from "../view-as-actions";
import { SecretResultForm } from "./secret-result-form";

export async function AccountCard({
  detail,
  canViewAs,
  canDisable,
  canResetPin,
}: {
  detail: UserDetail;
  canViewAs: boolean;
  canDisable: boolean;
  canResetPin: boolean;
}) {
  const t = await getTranslations("UserDetail");
  const locale = await getLocale();
  const p = detail.profile;
  const disabled = p.status === "disabled";
  const classes = [...detail.enrolments, ...detail.teaching].flatMap((e) =>
    e.classes ? [e.classes.code] : [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {t("account")}
          <Badge variant={disabled ? "destructive" : "secondary"}>
            {t(disabled ? "disabled" : "active")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{t("login")}</dt>
          <dd dir="ltr" className="text-start font-mono">
            {p.kind === "student" ? `${p.schools?.code ?? ""} / ${p.username}` : p.email}
          </dd>
          <dt className="text-muted-foreground">{t("classes")}</dt>
          <dd dir="ltr" className="text-start">
            {classes.join(", ") || "—"}
          </dd>
          {p.kind === "student" && (
            <>
              <dt className="text-muted-foreground">{t("consent")}</dt>
              <dd>{t(p.consent ? "yes" : "no")}</dd>
            </>
          )}
        </dl>
        <div className="flex flex-wrap items-start gap-2">
          {canViewAs && (
            <form action={startViewAs}>
              <input type="hidden" name="userId" value={p.id} />
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="outline">
                {t("viewAs")}
              </Button>
            </form>
          )}
          {canDisable && (
            <ActionForm action={setUserStatus} resetOnSuccess={false}>
              <input type="hidden" name="user_id" value={p.id} />
              <input type="hidden" name="status" value={disabled ? "active" : "disabled"} />
              <Button type="submit" variant={disabled ? "outline" : "destructive"}>
                {t(disabled ? "enable" : "disable")}
              </Button>
            </ActionForm>
          )}
          {canResetPin && p.kind === "student" && (
            <SecretResultForm action={resetPin}>
              <input type="hidden" name="user_id" value={p.id} />
              <Button type="submit" variant="outline">
                {t("resetPin")}
              </Button>
            </SecretResultForm>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
