import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, SelectField } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CEFR } from "@/features/content/import/fields";
import { localName } from "@/lib/i18n-names";
import { scoreSubmission } from "../teacher/actions";

type Rubric = { id: string; criteria: { key: string; name_en: string; name_ar: string }[] };

/** Teacher rubric form for one writing/speaking answer: CEFR per criterion, overall CEFR, comment. */
export async function ScoreForm({
  submissionId,
  rubric,
}: {
  submissionId: string;
  rubric: Rubric | null;
}) {
  const t = await getTranslations("TeacherPlacement");
  const locale = await getLocale();
  const levels = CEFR.map((c) => ({ value: c, label: c }));
  const prefix = `s-${submissionId.slice(0, 8)}`;

  return (
    <ActionForm action={scoreSubmission} className="flex flex-col gap-3" resetOnSuccess={false}>
      <input type="hidden" name="submission_id" value={submissionId} />
      {rubric && <input type="hidden" name="rubric_id" value={rubric.id} />}
      <FormRow>
        {rubric?.criteria.map((c) => (
          <SelectField
            key={c.key}
            idPrefix={prefix}
            label={localName(c, locale)}
            name={`c_${c.key}`}
            options={levels}
            required
            defaultValue=""
            placeholder="—"
          />
        ))}
        <SelectField
          idPrefix={prefix}
          label={t("overall")}
          name="cefr"
          options={levels}
          required
          defaultValue=""
          placeholder="—"
        />
      </FormRow>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefix}-comment`}>{t("comment")}</Label>
        <Textarea id={`${prefix}-comment`} name="comment" maxLength={1000} rows={2} />
      </div>
      <Button type="submit" className="self-start">
        {t("saveScore")}
      </Button>
    </ActionForm>
  );
}
