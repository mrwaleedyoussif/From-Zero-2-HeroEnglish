"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { getStorage, StorageNotConnectedError } from "@/lib/storage";
import { findLayoutFolder, listRecursive } from "@/lib/storage/layout";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/db";
import { unitSchema } from "./schema";

/** Where unit files are looked for when no folder link is given. */
const UNITS_FOLDER = "01_Content/Units";
const MAX_FILES = 400;
const MAX_ISSUES = 60;

export interface UnitsImportResult {
  files: number;
  imported: number;
  unchanged: number;
  issues: { file: string; message: string }[];
}

/** "https://drive.google.com/drive/folders/<id>?usp=sharing" or a bare id → the id. */
function folderIdFrom(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const id =
    /folders\/([-\w]{10,})/.exec(value)?.[1] ?? (/^[-\w]{10,}$/.test(value) ? value : null);
  if (!id) throw new ActionError("unitsFolderLink");
  return id;
}

/**
 * Import course units (one JSON file per unit) from a Drive folder and its subfolders: the
 * folder the Owner links, or /LinguaPath/01_Content/Units. Good files are saved, each broken
 * one is reported with its reason, and files that have not changed are left alone.
 */
export async function importUnits(
  _prev: unknown,
  form: FormData,
): Promise<ActionResult<UnitsImportResult>> {
  return runAction(async () => {
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    await assertCanWrite(actor, "content:import", platformTarget);
    let drive;
    try {
      drive = await getStorage();
    } catch (e) {
      if (e instanceof StorageNotConnectedError) throw new ActionError("driveNotConnected");
      throw e;
    }
    const folder =
      folderIdFrom(String(form.get("folder") ?? "")) ??
      (await findLayoutFolder(drive, UNITS_FOLDER));
    if (!folder) throw new ActionError("unitsFolderMissing");
    let listed;
    try {
      listed = await listRecursive(drive, folder);
    } catch {
      throw new ActionError("unitsFolderMissing");
    }
    const files = listed.filter((f) => f.file.name.toLowerCase().endsWith(".json"));
    if (files.length === 0) throw new ActionError("unitsNone");
    if (files.length > MAX_FILES) throw new ActionError("unitsTooMany");

    const db = await createClient();
    const { data: existing } = await db.from("course_units").select("id, hash").limit(2000);
    const known = new Map((existing ?? []).map((u) => [u.id, u.hash]));
    const result: UnitsImportResult = {
      files: files.length,
      imported: 0,
      unchanged: 0,
      issues: [],
    };
    const seen = new Map<string, string>();
    const rows = [];
    const problem = (file: string, message: string) => {
      if (result.issues.length < MAX_ISSUES) result.issues.push({ file, message });
    };

    // A few files at a time: quick, and gentle on Drive's limits.
    for (let i = 0; i < files.length; i += 6) {
      const batch = await Promise.all(
        files.slice(i, i + 6).map(async ({ path, file }) => {
          try {
            const body = (await drive.stream(file.id)).body;
            return { path, raw: await new Response(body).text() };
          } catch {
            return { path, raw: null };
          }
        }),
      );
      for (const { path, raw } of batch) {
        if (raw === null) {
          problem(path, "could not be read from Drive");
          continue;
        }
        let json: unknown;
        try {
          json = JSON.parse(raw.replace(/^﻿/, ""));
        } catch {
          problem(path, "is not valid JSON");
          continue;
        }
        const parsed = unitSchema.safeParse(json);
        if (!parsed.success) {
          const first = parsed.error.issues[0];
          problem(path, `${first?.path.join(".") || "file"}: ${first?.message ?? "invalid"}`);
          continue;
        }
        const unit = parsed.data;
        const twin = seen.get(unit.id);
        if (twin) {
          problem(path, `has the same id (${unit.id}) as ${twin}`);
          continue;
        }
        seen.set(unit.id, path);
        const hash = createHash("sha256").update(JSON.stringify(unit)).digest("hex");
        if (known.get(unit.id) === hash) {
          result.unchanged++;
          continue;
        }
        rows.push({
          id: unit.id,
          strand: unit.strand,
          level: unit.level,
          unit: unit.unit,
          title: unit.title,
          title_ar: unit.title_ar ?? null,
          content: unit as unknown as NonNullable<Json>,
          hash,
          status: "active",
        });
      }
    }
    for (let i = 0; i < rows.length; i += 20)
      check(await db.from("course_units").upsert(rows.slice(i, i + 20), { onConflict: "id" }));
    result.imported = rows.length;
    revalidatePath("/[locale]/owner/content", "page");
    return result;
  });
}
