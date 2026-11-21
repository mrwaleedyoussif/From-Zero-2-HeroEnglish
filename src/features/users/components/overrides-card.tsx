import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, type Option, SelectField, TextField } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/i18n-names";
import { addOverride, removeOverride } from "../access-actions";
import type { UserDetail } from "../queries";

export async function OverridesCard({
  detail,
  permissions,
  scopes,
  labels,
  canEdit,
}: {
  detail: UserDetail;
  permissions: Option[];
  scopes: Option[];
  labels: Map<string, string>;
  canEdit: boolean;
}) {
  const t = await getTranslations("UserDetail");
  const ts = await getTranslations("Scopes");
  const locale = await getLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overrides")}</CardTitle>
        <CardDescription>{t("overridesHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {detail.overrides.map((o) => {
            const expired = o.expired;
            return (
              <li key={o.id} className="flex flex-wrap items-center gap-2">
                <Badge variant={o.effect === "deny" ? "destructive" : "default"}>
                  {t(o.effect)}
                </Badge>
                <code dir="ltr" className="text-sm">
                  {o.permission_key}
                </code>
                <span className="text-sm text-muted-foreground">
                  {ts(o.scope_type)}
                  {o.scope_id && (
                    <span dir="ltr"> · {labels.get(o.scope_id) ?? o.scope_id.slice(0, 8)}</span>
                  )}
                  {o.expires_at &&
                    ` · ${t(expired ? "expired" : "until", { date: formatDate(o.expires_at, locale) })}`}
                </span>
                {o.reason && <span className="text-sm italic">“{o.reason}”</span>}
                {canEdit && (
                  <ActionForm action={removeOverride} successMessage="removed">
                    <input type="hidden" name="id" value={o.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      {t("remove")}
                    </Button>
                  </ActionForm>
                )}
              </li>
            );
          })}
          {detail.overrides.length === 0 && (
            <li className="text-muted-foreground">{t("noOverrides")}</li>
          )}
        </ul>
        {canEdit && (
          <ActionForm action={addOverride}>
            <input type="hidden" name="user_id" value={detail.profile.id} />
            <FormRow>
              <SelectField
                idPrefix="ov"
                label={t("effect")}
                name="effect"
                options={[
                  { value: "allow", label: t("allow") },
                  { value: "deny", label: t("deny") },
                ]}
              />
              <SelectField
                idPrefix="ov"
                label={t("permission")}
                name="permission_key"
                required
                options={permissions}
              />
              <SelectField
                idPrefix="ov"
                label={t("scope")}
                name="scope"
                required
                options={scopes}
              />
              <TextField idPrefix="ov" label={t("expires")} name="expires_at" type="date" />
              <TextField idPrefix="ov" label={t("reason")} name="reason" />
              <Button type="submit">{t("addOverride")}</Button>
            </FormRow>
          </ActionForm>
        )}
      </CardContent>
    </Card>
  );
}
