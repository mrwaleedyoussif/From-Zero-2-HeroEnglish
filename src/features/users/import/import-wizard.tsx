"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { applyImport, previewImport } from "./actions";
import { ImportResults } from "./import-results";

const statusVariant = { create: "default", exists: "secondary", error: "destructive" } as const;

export function ImportWizard() {
  const t = useTranslations("Import");
  const tErrors = useTranslations("Errors");
  const [csv, setCsv] = useState("");
  const [preview, previewAction, previewing] = useActionState(previewImport, null);
  const [applied, applyAction, applying] = useActionState(applyImport, null);

  async function onFile(file: File | undefined) {
    setCsv(file ? await file.text() : "");
  }

  if (applied?.ok && applied.data) return <ImportResults outcomes={applied.data} />;

  const plan = preview?.ok ? preview.data : undefined;
  const noteText = (n: string) => {
    const [kind, value] = n.split(":");
    return t(`notes.${kind}`, { value: value ?? "" });
  };

  return (
    <div className="flex flex-col gap-4">
      <form action={previewAction} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="csv-file">{t("file")}</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
        <input type="hidden" name="csv" value={csv} />
        <Button type="submit" disabled={!csv || previewing}>
          {t("check")}
        </Button>
      </form>

      {preview && !preview.ok && (
        <p role="alert" className="text-destructive">
          {tErrors(preview.error)}
        </p>
      )}
      {plan?.fileErrors.map((e) => {
        const [kind, value] = e.split(":");
        return (
          <p key={e} role="alert" className="text-destructive">
            {t(`fileErrors.${kind}`, { value: value ?? "" })}
          </p>
        );
      })}

      {plan && plan.rows.length > 0 && (
        <>
          <p>{t("summary", plan.counts)}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("line")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("login")}</TableHead>
                <TableHead>{t("details")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.rows.map((r) => (
                <TableRow key={r.line}>
                  <TableCell>{r.line}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status]}>{t(`statuses.${r.status}`)}</Badge>
                  </TableCell>
                  <TableCell>{r.fullName}</TableCell>
                  <TableCell dir="ltr" className="text-start font-mono text-xs">
                    {r.schoolCode} · {r.roleKey} · {r.login}
                  </TableCell>
                  <TableCell className="text-sm">
                    {[...r.errors.map((e) => t(`rowErrors.${e}`)), ...r.notes.map(noteText)].join(
                      " · ",
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <form action={applyAction}>
            <input type="hidden" name="csv" value={csv} />
            <Button type="submit" disabled={plan.counts.create === 0 || applying}>
              {applying ? t("applying") : t("apply", { count: plan.counts.create })}
            </Button>
          </form>
          {applied && !applied.ok && (
            <p role="alert" className="text-destructive">
              {tErrors(applied.error)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
