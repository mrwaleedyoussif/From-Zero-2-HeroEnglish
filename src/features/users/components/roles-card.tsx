import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, type Option, SelectField } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { localName } from "@/lib/i18n-names";
import { assignRole, removeRole } from "../access-actions";
import type { UserDetail, listRoles } from "../queries";

export async function RolesCard({
  detail,
  roles,
  scopes,
  labels,
  canEdit,
}: {
  detail: UserDetail;
  roles: Awaited<ReturnType<typeof listRoles>>;
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
        <CardTitle>{t("roles")}</CardTitle>
        <CardDescription>{t("rolesHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {detail.roles.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2">
              {r.roles && <Badge>{localName(r.roles, locale)}</Badge>}
              <span className="text-sm text-muted-foreground">
                {ts(r.scope_type)}
                {r.scope_id && (
                  <span dir="ltr"> · {labels.get(r.scope_id) ?? r.scope_id.slice(0, 8)}</span>
                )}
              </span>
              {r.roles?.status === "disabled" && (
                <Badge variant="outline">{t("roleDisabled")}</Badge>
              )}
              {canEdit && (
                <ActionForm action={removeRole} successMessage="removed">
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    {t("remove")}
                  </Button>
                </ActionForm>
              )}
            </li>
          ))}
          {detail.roles.length === 0 && <li className="text-muted-foreground">{t("noRoles")}</li>}
        </ul>
        {canEdit && (
          <ActionForm action={assignRole}>
            <input type="hidden" name="user_id" value={detail.profile.id} />
            <FormRow>
              <SelectField
                idPrefix="role"
                label={t("role")}
                name="role_id"
                required
                options={roles
                  .filter((r) => r.status === "active")
                  .map((r) => ({ value: r.id, label: localName(r, locale) }))}
              />
              <SelectField
                idPrefix="role"
                label={t("scope")}
                name="scope"
                required
                options={scopes}
              />
              <Button type="submit">{t("assign")}</Button>
            </FormRow>
          </ActionForm>
        )}
      </CardContent>
    </Card>
  );
}
