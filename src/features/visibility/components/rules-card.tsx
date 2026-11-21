import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, type Option, SelectField, TextField } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/i18n-names";
import { addRule, removeRule } from "../actions";
import type { StudioData } from "../queries";
import { subjectLabel } from "../subjects";

/** Rules on one key + the form to add a rule. */
export async function RulesCard({
  targetKey,
  data,
  subjects,
}: {
  targetKey: string;
  data: StudioData;
  subjects: Option[];
}) {
  const t = await getTranslations("Visibility");
  const locale = await getLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("rules")}</CardTitle>
        <CardDescription>{t("rulesHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {data.rules.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={r.effect === "hide" ? "destructive" : "default"}>
                {t(`effects.${r.effect}`)}
              </Badge>
              <span>
                {t(`subjects.${r.subject_type}`)}:{" "}
                {subjectLabel(data, r.subject_type, r.subject_id, locale)}
              </span>
              {(r.starts_at || r.ends_at) && (
                <span className="text-muted-foreground">
                  {r.starts_at ? formatDateTime(r.starts_at, locale) : "…"} →{" "}
                  {r.ends_at ? formatDateTime(r.ends_at, locale) : "…"}
                </span>
              )}
              <ActionForm action={removeRule} successMessage="removed">
                <input type="hidden" name="id" value={r.id} />
                <Button type="submit" size="sm" variant="ghost">
                  {t("remove")}
                </Button>
              </ActionForm>
            </li>
          ))}
          {data.rules.length === 0 && (
            <li className="text-sm text-muted-foreground">{t("noRules")}</li>
          )}
        </ul>
        <ActionForm action={addRule}>
          <input type="hidden" name="target_key" value={targetKey} />
          <FormRow>
            <SelectField
              idPrefix="rule"
              label={t("effect")}
              name="effect"
              options={[
                { value: "hide", label: t("effects.hide") },
                { value: "show", label: t("effects.show") },
              ]}
            />
            <SelectField idPrefix="rule" label={t("for")} name="subject" options={subjects} />
            <TextField
              idPrefix="rule"
              label={t("userIfUser")}
              name="user"
              dir="ltr"
              placeholder="sara.k"
            />
            <TextField idPrefix="rule" label={t("from")} name="starts_at" type="datetime-local" />
            <TextField idPrefix="rule" label={t("until")} name="ends_at" type="datetime-local" />
            <Button type="submit">{t("addRule")}</Button>
          </FormRow>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
