import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, SelectField, TextField } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { localName } from "@/lib/i18n-names";
import { createLog } from "../actions";

type Rubric = { id: string; criteria: { key: string; name_en: string; name_ar: string }[] };

/** Observation / walkthrough form with a 1–4 rubric, notes, agreed actions and a follow-up date. */
export async function LogForm({
  teachers,
  classes,
  rubric,
}: {
  teachers: { id: string; name: string }[];
  classes: { teacherId: string; id: string; code: string }[];
  rubric: Rubric | null;
}) {
  const t = await getTranslations("Coaching");
  const locale = await getLocale();
  const today = new Date().toISOString().slice(0, 10);
  const levels = [1, 2, 3, 4].map((n) => ({
    value: String(n),
    label: `${n} · ${t(`level.${n}`)}`,
  }));
  const names = new Map(teachers.map((x) => [x.id, x.name]));

  return (
    <ActionForm
      action={createLog}
      successMessage="saved"
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      {rubric && <input type="hidden" name="rubric_id" value={rubric.id} />}
      <FormRow>
        <SelectField
          idPrefix="log"
          label={t("teacher")}
          name="teacher_id"
          required
          defaultValue=""
          placeholder="—"
          options={teachers.map((x) => ({ value: x.id, label: x.name }))}
        />
        <SelectField
          idPrefix="log"
          label={t("class")}
          name="class_id"
          defaultValue=""
          placeholder="—"
          options={classes.map((c) => ({
            value: c.id,
            label: `${c.code} · ${names.get(c.teacherId) ?? ""}`,
          }))}
        />
        <SelectField
          idPrefix="log"
          label={t("kind")}
          name="kind"
          defaultValue="observation"
          options={(["observation", "walkthrough", "meeting"] as const).map((k) => ({
            value: k,
            label: t(`kinds.${k}`),
          }))}
        />
        <TextField
          idPrefix="log"
          label={t("date")}
          name="observed_on"
          type="date"
          defaultValue={today}
          required
        />
      </FormRow>
      {rubric && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">{t("rubric")}</legend>
          <FormRow>
            {rubric.criteria.map((c) => (
              <SelectField
                key={c.key}
                idPrefix="log"
                label={localName(c, locale)}
                name={`s_${c.key}`}
                defaultValue=""
                placeholder="—"
                options={levels}
              />
            ))}
          </FormRow>
        </fieldset>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="log-notes">{t("notes")}</Label>
          <Textarea id="log-notes" name="notes" maxLength={4000} rows={3} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="log-actions">{t("agreedActions")}</Label>
          <Textarea id="log-actions" name="agreed_actions" maxLength={2000} rows={3} />
        </div>
      </div>
      <FormRow>
        <TextField idPrefix="log" label={t("followUp")} name="follow_up_on" type="date" />
        <Button type="submit">{t("save")}</Button>
      </FormRow>
    </ActionForm>
  );
}
