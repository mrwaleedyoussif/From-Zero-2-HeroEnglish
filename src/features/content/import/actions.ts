"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { getStorage, StorageNotConnectedError } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/db";
import { applyPayload, type ImportPayload } from "./apply";
import {
  ContentFolderMissingError,
  listMedia,
  readContentSheets,
  syncMediaAssets,
} from "./drive-source";
import { loadExisting } from "./existing";
import type { ImportIssue } from "./parse";
import { buildPreview, type SheetSummary } from "./pipeline";

const MAX_ISSUES = 300;
const PREVIEW_TTL_MS = 2 * 60 * 60 * 1000;

export interface PreviewResult {
  jobId: string;
  sheets: SheetSummary[];
  issues: ImportIssue[];
  missingMedia: { name: string; sheet: string; line: number; key: string }[];
  toApply: number;
}

async function authorize() {
  const actor = await getActor();
  if (!actor) throw new ActionError("signedOut");
  await assertCanWrite(actor, "content:import", platformTarget);
  return actor;
}

async function storage() {
  try {
    return await getStorage();
  } catch (e) {
    if (e instanceof StorageNotConnectedError) throw new ActionError("driveNotConnected");
    throw e;
  }
}

/** Step 1 (SPEC §6): read the sheets, validate, diff against the DB. Writes only an import_jobs row. */
export async function previewContentSync(): Promise<ActionResult<PreviewResult>> {
  return runAction(async () => {
    const actor = await authorize();
    const drive = await storage();
    const db = await createClient();
    let raw;
    try {
      raw = await readContentSheets(drive);
    } catch (e) {
      if (e instanceof ContentFolderMissingError) throw new ActionError("contentFolderMissing");
      throw e;
    }
    const [media, existing] = await Promise.all([listMedia(drive), loadExisting(db)]);
    const preview = buildPreview(raw, existing, new Set(media.map((m) => m.name)));

    // Keep only rows that will change something; unchanged rows are not rewritten.
    const changing = new Map(
      preview.sheets.map((s) => [s.name, new Set([...s.created, ...s.changed.map((c) => c.key)])]),
    );
    const pick = <K extends keyof typeof preview.valid>(k: K) =>
      preview.valid[k].filter((r) => changing.get(k)?.has(r.key));
    const payload: ImportPayload = {
      rows: {
        Departments: pick("Departments"),
        Skills: pick("Skills"),
        Passages: pick("Passages"),
        Questions: pick("Questions"),
        Lessons: pick("Lessons"),
        CutScores: pick("CutScores"),
        Badges: pick("Badges"),
      },
      changedQuestions:
        preview.sheets.find((s) => s.name === "Questions")?.changed.map((c) => c.key) ?? [],
    };
    const toApply = Object.values(payload.rows).reduce((n, rows) => n + rows.length, 0);
    const issues = preview.issues.slice(0, MAX_ISSUES);
    const { data: job, error } = await db
      .from("import_jobs")
      .insert({
        started_by: actor.real.id,
        status: "previewed",
        summary: preview.sheets as unknown as NonNullable<Json>,
        errors: issues as unknown as NonNullable<Json>,
        missing_media: preview.missingMedia as unknown as NonNullable<Json>,
        payload: payload as unknown as Json,
      })
      .select("id")
      .single();
    if (error || !job) throw new ActionError("failed");
    return {
      jobId: job.id,
      sheets: preview.sheets,
      issues,
      missingMedia: preview.missingMedia,
      toApply,
    };
  });
}

/** Step 2: apply exactly what was previewed, then drop the stored rows (DB budget). */
export async function applyContentSync(jobId: string): Promise<ActionResult<{ applied: number }>> {
  return runAction(async () => {
    z.guid().parse(jobId);
    await authorize();
    const db = await createClient();
    const { data: job } = await db
      .from("import_jobs")
      .select("status, payload, created_at")
      .eq("id", jobId)
      .single();
    if (!job || job.status !== "previewed" || !job.payload) throw new ActionError("previewExpired");
    if (Date.now() - new Date(job.created_at).getTime() > PREVIEW_TTL_MS) {
      await db.from("import_jobs").update({ status: "expired", payload: null }).eq("id", jobId);
      throw new ActionError("previewExpired");
    }
    const payload = job.payload as unknown as ImportPayload;
    try {
      const mediaIds = await syncMediaAssets(db, await listMedia(await storage()));
      await applyPayload(db, payload, mediaIds);
    } catch (e) {
      await db
        .from("import_jobs")
        .update({
          status: "failed",
          payload: null,
          errors: [{ code: "applyFailed", message: String(e) }] as unknown as NonNullable<Json>,
        })
        .eq("id", jobId);
      throw e;
    }
    await db
      .from("import_jobs")
      .update({ status: "applied", payload: null, applied_at: new Date().toISOString() })
      .eq("id", jobId);
    revalidatePath("/[locale]", "layout");
    return { applied: Object.values(payload.rows).reduce((n, rows) => n + rows.length, 0) };
  });
}
