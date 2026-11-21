import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, SelectField } from "@/components/field";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listSchools } from "@/features/schools/queries";
import { addLink, applyDefaults, endLink } from "@/features/supervision/actions";
import { supervisionForSchool } from "@/features/supervision/queries";
import { can } from "@/lib/auth/can";
import { requirePermission } from "@/lib/auth/guard";
import { schoolTarget } from "@/lib/auth/scope";
import { localName } from "@/lib/i18n-names";

export default async function SupervisionPage({
  params,
  searchParams,
}: PageProps<"/[locale]/owner/supervision">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "supervision:view");
  const t = await getTranslations("Supervision");
  const schools = await listSchools();
  const requested = (await searchParams).school;
  const school = schools.find((s) => s.id === requested) ?? schools[0];

  if (!school) return <PageHeader title={t("title")} description={t("noSchool")} />;
  const { groups, staff } = await supervisionForSchool(school.id);
  const canEdit =
    !actor.viewAs && (await can(actor, "supervision:manage", schoolTarget(school.id)));
  const kinds = ["line", "academic", "coaching"] as const;

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      <form method="get" className="contents">
        <FormRow>
          <SelectField
            label={t("school")}
            name="school"
            defaultValue={school.id}
            options={schools.map((s) => ({
              value: s.id,
              label: `${s.code} · ${localName(s, locale)}`,
            }))}
          />
          <Button type="submit" variant="secondary">
            {t("show")}
          </Button>
        </FormRow>
      </form>

      {groups.length === 0 && <p className="text-muted-foreground">{t("empty")}</p>}
      <ul className="flex flex-col gap-3">
        {groups.map((g) => (
          <li key={g.name}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{g.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2 border-s-2 border-border ps-4">
                  {g.links.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center gap-2">
                      <span>{l.supervisee?.full_name}</span>
                      <Badge variant="secondary">{t(`kinds.${l.kind}`)}</Badge>
                      {l.source === "default" && <Badge variant="outline">{t("auto")}</Badge>}
                      {canEdit && (
                        <ActionForm action={endLink} successMessage="removed">
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="school_id" value={school.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            {t("end")}
                          </Button>
                        </ActionForm>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>{t("add")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ActionForm action={addLink}>
              <input type="hidden" name="school_id" value={school.id} />
              <FormRow>
                <SelectField
                  label={t("supervisor")}
                  name="supervisor_id"
                  required
                  options={staff.map((s) => ({ value: s.id, label: s.full_name }))}
                />
                <SelectField
                  label={t("supervisee")}
                  name="supervisee_id"
                  required
                  options={staff.map((s) => ({ value: s.id, label: s.full_name }))}
                />
                <SelectField
                  label={t("kind")}
                  name="kind"
                  options={kinds.map((k) => ({ value: k, label: t(`kinds.${k}`) }))}
                />
                <Button type="submit">{t("add")}</Button>
              </FormRow>
            </ActionForm>
            <ActionForm action={applyDefaults} resetOnSuccess={false}>
              <input type="hidden" name="school_id" value={school.id} />
              <Button type="submit" variant="outline">
                {t("applyDefaults")}
              </Button>
              <p className="mt-1 text-sm text-muted-foreground">{t("applyDefaultsHelp")}</p>
            </ActionForm>
          </CardContent>
        </Card>
      )}
    </>
  );
}
