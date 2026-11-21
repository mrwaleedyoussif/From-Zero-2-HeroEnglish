"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { applyContentSync, type PreviewResult, previewContentSync } from "../import/actions";

/** Owner content sync (SPEC §6): check sheets → see the diff and errors → apply. */
export function ContentSync() {
  const t = useTranslations("ContentSync");
  const te = useTranslations("ContentErrors");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [pending, start] = useTransition();

  const check = () =>
    start(async () => {
      const r = await previewContentSync();
      if (r.ok && r.data) setPreview(r.data);
      else if (!r.ok) toast.error(tErrors(r.error));
    });
  const apply = () =>
    start(async () => {
      if (!preview) return;
      const r = await applyContentSync(preview.jobId);
      if (r.ok) {
        toast.success(t("applied", { count: r.data?.applied ?? 0 }));
        setPreview(null);
        router.refresh();
      } else toast.error(tErrors(r.error));
    });

  const errors = preview?.issues.filter((i) => !i.warning).length ?? 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={check} disabled={pending}>
          {pending && !preview ? t("checking") : t("check")}
        </Button>
        {preview && (
          <Button onClick={apply} disabled={pending || preview.toApply === 0} variant="secondary">
            {t("apply", { count: preview.toApply })}
          </Button>
        )}
      </div>
      {preview && (
        <>
          <p role="status" className="text-sm">
            {preview.toApply === 0 && errors === 0
              ? t("upToDate")
              : t("summary", { changes: preview.toApply, errors })}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("sheet")}</TableHead>
                <TableHead>{t("new")}</TableHead>
                <TableHead>{t("changed")}</TableHead>
                <TableHead>{t("unchanged")}</TableHead>
                <TableHead>{t("errors")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.sheets.map((s) => (
                <TableRow key={s.name} data-sheet={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  {s.found ? (
                    <>
                      <TableCell>{s.created.length}</TableCell>
                      <TableCell
                        title={s.changed.map((c) => `${c.key}: ${c.fields.join(", ")}`).join("\n")}
                      >
                        {s.changed.length}
                      </TableCell>
                      <TableCell>{s.unchanged}</TableCell>
                      <TableCell>
                        {s.errors > 0 ? <Badge variant="destructive">{s.errors}</Badge> : 0}
                      </TableCell>
                    </>
                  ) : (
                    <TableCell colSpan={4} className="text-muted-foreground">
                      {t("notFound")}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {preview.issues.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("where")}</TableHead>
                  <TableHead>{t("column")}</TableHead>
                  <TableHead>{t("problem")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.issues.map((i, n) => (
                  <TableRow key={n} data-issue={i.code}>
                    <TableCell className="whitespace-nowrap">
                      {t("rowRef", { sheet: i.sheet, line: i.line })}
                      {i.key && (
                        <span className="ms-2 font-mono text-xs text-muted-foreground" dir="ltr">
                          {i.key}
                        </span>
                      )}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start font-mono text-xs">
                      {i.column}
                    </TableCell>
                    <TableCell>
                      {i.warning && (
                        <Badge variant="outline" className="me-2">
                          {t("warning")}
                        </Badge>
                      )}
                      {te(i.code, i.params ?? {})}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {preview.missingMedia.length > 0 && (
            <Alert>
              <AlertTitle>{t("missingMedia", { count: preview.missingMedia.length })}</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 list-disc ps-5 text-sm">
                  {preview.missingMedia.map((m) => (
                    <li key={`${m.sheet}-${m.line}`}>
                      <code dir="ltr">{m.name}</code> —{" "}
                      {t("rowRef", { sheet: m.sheet, line: m.line })}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
