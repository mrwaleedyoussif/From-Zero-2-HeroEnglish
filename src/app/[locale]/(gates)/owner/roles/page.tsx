import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, SelectField, TextField } from "@/components/field";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createRole, setRoleStatus } from "@/features/roles/actions";
import { PermissionMatrix } from "@/features/roles/components/permission-matrix";
import { listPermissions, listRoles } from "@/features/users/queries";
import { can } from "@/lib/auth/can";
import { scopeTypes } from "@/lib/auth/engine";
import { requirePermission } from "@/lib/auth/guard";
import { platformTarget } from "@/lib/auth/scope";
import { localName } from "@/lib/i18n-names";
import { createClient } from "@/lib/supabase/server";

export default async function RolesPage({ params }: PageProps<"/[locale]/owner/roles">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "roles:view");
  const t = await getTranslations("Roles");
  const ts = await getTranslations("Scopes");
  const db = await createClient();
  const [roles, permissions, grants] = await Promise.all([
    listRoles(),
    listPermissions(),
    db.from("role_permissions").select("role_id, permission_key"),
  ]);
  const canEdit = !actor.viewAs && (await can(actor, "roles:manage", platformTarget));
  const isLocked = (r: (typeof roles)[number]) =>
    r.is_system && r.default_scope_type === "platform";

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      <PermissionMatrix
        roles={roles.map((r) => ({
          id: r.id,
          label: localName(r, locale),
          locked: isLocked(r),
          disabled: r.status !== "active",
        }))}
        permissions={permissions.map((p) => ({
          key: p.key,
          module: p.module,
          description: locale === "ar" ? p.description_ar : p.description_en,
        }))}
        granted={(grants.data ?? []).map((g) => `${g.role_id}|${g.permission_key}`)}
        canEdit={canEdit}
      />
      {canEdit && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("newRole")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={createRole}>
                <FormRow>
                  <TextField
                    label={t("key")}
                    name="key"
                    dir="ltr"
                    required
                    placeholder="librarian"
                    className="w-36"
                  />
                  <TextField label={t("nameEn")} name="name_en" dir="ltr" required />
                  <TextField label={t("nameAr")} name="name_ar" dir="rtl" required />
                  <SelectField
                    label={t("defaultScope")}
                    name="default_scope_type"
                    defaultValue="school"
                    options={scopeTypes.map((s) => ({ value: s, label: ts(s) }))}
                  />
                  <Button type="submit">{t("create")}</Button>
                </FormRow>
              </ActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("statusTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {roles
                .filter((r) => !isLocked(r))
                .map((r) => (
                  <ActionForm key={r.id} action={setRoleStatus} resetOnSuccess={false}>
                    <input type="hidden" name="role_id" value={r.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={r.status === "active" ? "disabled" : "active"}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant={r.status === "active" ? "outline" : "secondary"}
                    >
                      {t(r.status === "active" ? "disableRole" : "enableRole", {
                        role: localName(r, locale),
                      })}
                    </Button>
                  </ActionForm>
                ))}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
