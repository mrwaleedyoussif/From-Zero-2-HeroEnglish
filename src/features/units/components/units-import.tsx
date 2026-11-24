"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importUnits } from "../import";

/** Owner: bring unit files (JSON) in from a Drive folder, and see what happened to each. */
export function UnitsImport() {
  const t = useTranslations("Units");
  const te = useTranslations("Errors");
  const [state, action, pending] = useActionState(importUnits, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="units-folder">{t("importFolder")}</Label>
        <Input
          id="units-folder"
          name="folder"
          dir="ltr"
          placeholder="https://drive.google.com/drive/folders/…"
        />
        <p className="text-sm text-muted-foreground">{t("importFolderHelp")}</p>
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t("importing") : t("importButton")}
      </Button>
      <div aria-live="polite" className="flex flex-col gap-2">
        {state && !state.ok && <p className="font-medium text-destructive">{te(state.error)}</p>}
        {state?.ok && state.data && (
          <>
            <p className="font-semibold" data-units-imported={state.data.imported}>
              {t("importDone", {
                files: state.data.files,
                imported: state.data.imported,
                unchanged: state.data.unchanged,
                problems: state.data.issues.length,
              })}
            </p>
            {state.data.issues.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm">
                {state.data.issues.map((i) => (
                  <li key={i.file} data-unit-issue>
                    <strong dir="ltr">{i.file}</strong>: {i.message}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </form>
  );
}
