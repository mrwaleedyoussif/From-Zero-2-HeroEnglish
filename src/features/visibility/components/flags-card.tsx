import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, type Option, SelectField } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { registry } from "@/lib/registry";
import { saveFlag, setFlagSubject } from "../actions";
import type { StudioData } from "../queries";
import { subjectLabel } from "../subjects";

/** Feature switches: on for everyone (the default), off, or on for a list of subjects. */
export async function FlagsCard({ data, subjects }: { data: StudioData; subjects: Option[] }) {
  const t = await getTranslations("Visibility");
  const tr = await getTranslations("Registry");
  const locale = await getLocale();
  const features = registry.filter((e) => e.kind === "feature");
  const listSubjects = subjects.filter((s) => s.value !== "user:");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("flags")}</CardTitle>
        <CardDescription>{t("flagsHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {features.map((f) => {
          const flag = data.flags.find((x) => x.key === f.key);
          // No flag yet = the feature is on for everyone.
          const enabled = flag?.enabled ?? true;
          const list = Array.isArray(flag?.subjects)
            ? (flag.subjects as { type: string; id: string }[])
            : [];
          const state = !enabled ? "off" : flag?.rollout === "list" ? "list" : "all";
          return (
            <div
              key={f.key}
              className="flex flex-col gap-2 border-b border-border pb-3 last:border-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{tr(f.key)}</span>
                <Badge variant={state === "off" ? "outline" : "default"}>
                  {t(`flagStates.${state}`)}
                </Badge>
                {(["off", "all", "list"] as const)
                  .filter((s) => s !== state)
                  .map((s) => (
                    <ActionForm key={s} action={saveFlag} resetOnSuccess={false}>
                      <input type="hidden" name="key" value={f.key} />
                      <input type="hidden" name="enabled" value={s === "off" ? "false" : "true"} />
                      <input type="hidden" name="rollout" value={s === "list" ? "list" : "all"} />
                      <Button type="submit" size="sm" variant="ghost">
                        {t(`flagActions.${s}`)}
                      </Button>
                    </ActionForm>
                  ))}
              </div>
              {state === "list" && (
                <div className="flex flex-wrap items-end gap-2 ps-4">
                  {list.map((s) => (
                    <ActionForm
                      key={`${s.type}:${s.id}`}
                      action={setFlagSubject}
                      successMessage="removed"
                    >
                      <input type="hidden" name="key" value={f.key} />
                      <input type="hidden" name="subject" value={`${s.type}:${s.id}`} />
                      <input type="hidden" name="remove" value="true" />
                      <Button type="submit" size="sm" variant="secondary">
                        {t(`subjects.${s.type}`)}: {subjectLabel(data, s.type, s.id, locale)} ✕
                      </Button>
                    </ActionForm>
                  ))}
                  <ActionForm action={setFlagSubject}>
                    <input type="hidden" name="key" value={f.key} />
                    <FormRow>
                      <SelectField
                        idPrefix={`flag-${f.key}`}
                        label={t("addSubject")}
                        name="subject"
                        options={listSubjects}
                      />
                      <Button type="submit" size="sm">
                        {t("add")}
                      </Button>
                    </FormRow>
                  </ActionForm>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
