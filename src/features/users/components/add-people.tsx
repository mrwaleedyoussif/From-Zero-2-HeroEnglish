import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, SelectField, TextField } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { localName } from "@/lib/i18n-names";
import { createStudent, inviteStaff } from "../actions";
import type { SchoolStructure, listRoles } from "../queries";
import { scopeOptions } from "../scope-options";
import { SecretResultForm } from "./secret-result-form";

type Roles = Awaited<ReturnType<typeof listRoles>>;

export async function InviteStaffCard({
  structure,
  roles,
  platform,
}: {
  structure: SchoolStructure | null;
  roles: Roles;
  platform: boolean;
}) {
  const t = await getTranslations("Users");
  const ts = await getTranslations("Scopes");
  const locale = await getLocale();
  const scopes = scopeOptions(
    structure,
    {
      platform: ts("platform"),
      self: ts("self"),
      school: ts("school"),
      grade: ts("grade"),
      class: ts("class"),
    },
    locale,
    { platform, self: false },
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("inviteStaff")}</CardTitle>
        <CardDescription>{t("inviteHelp")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={inviteStaff} successMessage="invited">
          <input type="hidden" name="school_id" value={structure?.school?.id ?? ""} />
          <FormRow>
            <TextField idPrefix="invite" label={t("fullName")} name="full_name" required />
            <TextField
              idPrefix="invite"
              label={t("email")}
              name="email"
              type="email"
              dir="ltr"
              required
            />
            <SelectField
              idPrefix="invite"
              label={t("role")}
              name="role_id"
              required
              options={roles
                .filter((r) => r.status === "active" && r.default_scope_type !== "self")
                .map((r) => ({ value: r.id, label: localName(r, locale) }))}
            />
            <SelectField
              idPrefix="invite"
              label={t("scope")}
              name="scope"
              required
              options={scopes}
            />
            <SelectField
              idPrefix="invite"
              label={t("language")}
              name="locale"
              defaultValue={locale}
              options={[
                { value: "en", label: "English" },
                { value: "ar", label: "العربية" },
              ]}
            />
            <Button type="submit">{t("sendInvite")}</Button>
          </FormRow>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

export async function CreateStudentCard({ structure }: { structure: SchoolStructure }) {
  const t = await getTranslations("Users");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("addStudent")}</CardTitle>
        <CardDescription>{t("addStudentHelp")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SecretResultForm action={createStudent}>
          <input type="hidden" name="school_id" value={structure.school?.id ?? ""} />
          <FormRow>
            <TextField idPrefix="student" label={t("fullName")} name="full_name" required />
            <TextField
              idPrefix="student"
              label={t("usernameOptional")}
              name="username"
              dir="ltr"
              placeholder="sara.k"
            />
            <SelectField
              idPrefix="student"
              label={t("class")}
              name="class_id"
              placeholder="—"
              options={structure.classes.map((c) => ({ value: c.id, label: c.code }))}
            />
            <div className="flex items-center gap-2 pb-2">
              <input id="consent" name="consent" type="checkbox" className="size-4" />
              <Label htmlFor="consent">{t("consent")}</Label>
            </div>
            <Button type="submit">{t("addStudent")}</Button>
          </FormRow>
        </SecretResultForm>
      </CardContent>
    </Card>
  );
}
