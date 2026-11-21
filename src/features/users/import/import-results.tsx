"use client";

import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ImportOutcome } from "./apply";
import { LoginCardsGrid } from "./login-cards-grid";

/** Import finished: summary, failures, and the one-time student credentials (print or save now). */
export function ImportResults({ outcomes }: { outcomes: ImportOutcome[] }) {
  const t = useTranslations("Import");
  const tErrors = useTranslations("Errors");
  const created = outcomes.filter((o) => o.ok);
  const failed = outcomes.filter((o) => !o.ok);
  const credentials = created.filter((o) => o.pin);

  function downloadCsv() {
    const lines = [
      "school_code,class,full_name,username,pin",
      ...credentials.map((c) =>
        [
          c.schoolCode,
          c.classCode ?? "",
          `"${c.fullName.replace(/"/g, '""')}"`,
          c.username,
          c.pin,
        ].join(","),
      ),
    ];
    const url = URL.createObjectURL(new Blob([`﻿${lines.join("\n")}`], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "student-logins.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert role="status" className="print:hidden">
        <AlertTitle>{t("done", { created: created.length, failed: failed.length })}</AlertTitle>
        {credentials.length > 0 && <AlertDescription>{t("pinsOnce")}</AlertDescription>}
      </Alert>
      {credentials.length > 0 && (
        <div className="flex gap-2 print:hidden">
          <Button onClick={() => window.print()}>{t("printCards")}</Button>
          <Button variant="outline" onClick={downloadCsv}>
            {t("downloadCsv")}
          </Button>
        </div>
      )}
      {failed.length > 0 && (
        <Table className="print:hidden">
          <TableHeader>
            <TableRow>
              <TableHead>{t("line")}</TableHead>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("details")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {failed.map((f) => (
              <TableRow key={f.line}>
                <TableCell>{f.line}</TableCell>
                <TableCell>{f.fullName}</TableCell>
                <TableCell>{tErrors(f.error ?? "failed")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {credentials.length > 0 && (
        <LoginCardsGrid
          cards={credentials.map((c) => ({
            fullName: c.fullName,
            schoolCode: c.schoolCode ?? "",
            username: c.username ?? "",
            pin: c.pin ?? "",
            classCode: c.classCode,
          }))}
        />
      )}
    </div>
  );
}
