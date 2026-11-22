import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { TextField } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { eraseStudent } from "../actions";

/** Owner: download or erase a student's data (SPEC §15, Saudi PDPL). */
export async function PrivacyCard({
  studentId,
  username,
}: {
  studentId: string;
  username: string;
}) {
  const t = await getTranslations("Privacy");
  const locale = await getLocale();
  return (
    <Card data-privacy>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("intro")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <a
          href={`/api/students/${studentId}/export`}
          className="self-start text-sm text-primary hover:underline"
          data-export-student
        >
          ⬇ {t("export")}
        </a>
        <ActionForm
          action={eraseStudent}
          className="flex flex-col gap-2 rounded-md border border-destructive/40 p-3"
        >
          <input type="hidden" name="id" value={studentId} />
          <input type="hidden" name="locale" value={locale} />
          <p className="text-sm">{t("eraseWarning")}</p>
          <TextField
            idPrefix="erase"
            label={t("confirm", { username })}
            name="confirm"
            required
            autoComplete="off"
          />
          <Button type="submit" variant="destructive" size="sm" className="self-start">
            {t("erase")}
          </Button>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
