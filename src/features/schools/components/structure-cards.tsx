import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, SelectField, TextField } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatDate, localName } from "@/lib/i18n-names";
import { createClass, createGrade, createYear } from "../actions";
import type { SchoolDetail } from "../queries";

export async function YearsCard({ detail, canEdit }: { detail: SchoolDetail; canEdit: boolean }) {
  const t = await getTranslations("Schools");
  const locale = await getLocale();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("years")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1">
          {detail.years.map((y) => (
            <li key={y.id} className="flex flex-wrap items-center gap-2">
              <span dir="ltr">{y.name}</span>
              <span className="text-sm text-muted-foreground">
                {formatDate(y.starts_on, locale)} – {formatDate(y.ends_on, locale)}
              </span>
              {y.is_current && <Badge>{t("current")}</Badge>}
            </li>
          ))}
        </ul>
        {canEdit && (
          <ActionForm action={createYear}>
            <input type="hidden" name="school_id" value={detail.school.id} />
            <FormRow>
              <TextField
                idPrefix="year"
                label={t("yearName")}
                name="name"
                placeholder="2027-2028"
                dir="ltr"
                required
                className="w-32"
              />
              <TextField
                idPrefix="year"
                label={t("startsOn")}
                name="starts_on"
                type="date"
                required
              />
              <TextField idPrefix="year" label={t("endsOn")} name="ends_on" type="date" required />
              <div className="flex items-center gap-2 pb-2">
                <input id="is_current" name="is_current" type="checkbox" className="size-4" />
                <Label htmlFor="is_current">{t("current")}</Label>
              </div>
              <Button type="submit">{t("addYear")}</Button>
            </FormRow>
          </ActionForm>
        )}
      </CardContent>
    </Card>
  );
}

export async function GradesCard({ detail, canEdit }: { detail: SchoolDetail; canEdit: boolean }) {
  const t = await getTranslations("Schools");
  const locale = await getLocale();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("grades")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {detail.grades.map((g) => (
            <Badge key={g.id} variant="secondary">
              {localName(g, locale)}
            </Badge>
          ))}
        </div>
        {canEdit && (
          <ActionForm action={createGrade}>
            <input type="hidden" name="school_id" value={detail.school.id} />
            <FormRow>
              <TextField
                idPrefix="grade"
                label={t("gradeCode")}
                name="code"
                required
                dir="ltr"
                className="w-20"
              />
              <TextField idPrefix="grade" label={t("nameEn")} name="name_en" required dir="ltr" />
              <TextField idPrefix="grade" label={t("nameAr")} name="name_ar" required dir="rtl" />
              <TextField
                idPrefix="grade"
                label={t("order")}
                name="sort_order"
                type="number"
                min={0}
                max={20}
                className="w-20"
              />
              <Button type="submit">{t("addGrade")}</Button>
            </FormRow>
          </ActionForm>
        )}
      </CardContent>
    </Card>
  );
}

export async function NewClassForm({ detail }: { detail: SchoolDetail }) {
  const t = await getTranslations("Schools");
  const locale = await getLocale();
  const currentYear = detail.years.find((y) => y.is_current) ?? detail.years[0];
  return (
    <ActionForm action={createClass}>
      <input type="hidden" name="school_id" value={detail.school.id} />
      <FormRow>
        <SelectField
          idPrefix="class"
          label={t("grade")}
          name="grade_id"
          required
          options={detail.grades.map((g) => ({ value: g.id, label: localName(g, locale) }))}
        />
        <SelectField
          idPrefix="class"
          label={t("year")}
          name="year_id"
          required
          defaultValue={currentYear?.id}
          options={detail.years.map((y) => ({ value: y.id, label: y.name }))}
        />
        <TextField
          idPrefix="class"
          label={t("classCode")}
          name="code"
          required
          dir="ltr"
          placeholder="4B"
          className="w-24"
        />
        <Button type="submit">{t("addClass")}</Button>
      </FormRow>
    </ActionForm>
  );
}
