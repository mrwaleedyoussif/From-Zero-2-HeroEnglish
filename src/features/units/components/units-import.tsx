"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importUnitBatch, linkUnitAudio, listUnitFiles, type UnitsImportResult } from "../import";

/** Files per request: Word booklets hold several lessons each, so fewer of them at a time. */
const STEP = 24;
const STEP_DOCX = 3;

/**
 * Owner: bring unit files (JSON) in from a Drive folder, a few at a time with a progress bar,
 * then link any recorded audio. Stopping halfway loses nothing.
 */
export function UnitsImport() {
  const t = useTranslations("Units");
  const te = useTranslations("Errors");
  const router = useRouter();
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<(UnitsImportResult & { audio: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const listed = await listUnitFiles(folder);
      if (!listed.ok || !listed.data) return setError(te(listed.ok ? "failed" : listed.error));
      const files = listed.data;
      const total: UnitsImportResult = { imported: 0, unchanged: 0, issues: [] };
      const step = files.some((f) => f.path.endsWith(".docx")) ? STEP_DOCX : STEP;
      for (let i = 0; i < files.length; i += step) {
        setProgress({ done: i, total: files.length });
        const r = await importUnitBatch(files.slice(i, i + step));
        if (!r.ok || !r.data) return setError(te(r.ok ? "failed" : r.error));
        total.imported += r.data.imported;
        total.unchanged += r.data.unchanged;
        total.issues.push(...r.data.issues);
      }
      setProgress({ done: files.length, total: files.length });
      const audio = await linkUnitAudio(folder);
      setResult({ ...total, audio: audio.ok ? (audio.data?.files ?? 0) : 0 });
      router.refresh();
    } catch {
      setError(te("failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="units-folder">{t("importFolder")}</Label>
        <Input
          id="units-folder"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          dir="ltr"
          placeholder="https://drive.google.com/drive/folders/…"
        />
        <p className="text-sm text-muted-foreground">{t("importFolderHelp")}</p>
      </div>
      <Button onClick={() => void run()} disabled={busy} className="self-start">
        {busy ? t("importing") : t("importButton")}
      </Button>
      {progress && (
        <div className="flex flex-col gap-1">
          <progress
            value={progress.done}
            max={progress.total}
            aria-label={t("importing")}
            className="h-3 w-full max-w-md accent-[#047857]"
          />
          <p className="text-sm text-muted-foreground">
            {t("importProgress", { done: progress.done, total: progress.total })}
          </p>
        </div>
      )}
      <div aria-live="polite" className="flex flex-col gap-2">
        {error && <p className="font-medium text-destructive">{error}</p>}
        {result && (
          <>
            <p className="font-semibold" data-units-imported={result.imported}>
              {t("importDone", {
                files: progress?.total ?? 0,
                imported: result.imported,
                unchanged: result.unchanged,
                problems: result.issues.length,
              })}
            </p>
            <p className="text-sm" data-units-audio={result.audio}>
              {t("importAudio", { n: result.audio })}
            </p>
            {result.issues.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm">
                {result.issues.map((i) => (
                  <li key={i.file} data-unit-issue>
                    <strong dir="ltr">{i.file}</strong>: {i.message}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
