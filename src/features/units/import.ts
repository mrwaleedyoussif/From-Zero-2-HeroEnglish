"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { getStorage, StorageNotConnectedError } from "@/lib/storage";
import { listMedia, syncMediaAssets } from "@/features/content/import/drive-source";
import { findLayoutFolder, listRecursive } from "@/lib/storage/layout";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/db";
import { unitSchema } from "./schema";

/** Where unit files are looked for when no folder link is given. */
const UNITS_FOLDER = "01_Content/Units";
const MAX_FILES = 1200;
/** Files per request: small enough to finish well inside the time a request may take. */
const BATCH = 24;
const MAX_ISSUES = 60;

export interface UnitFile {
  id: string;
  path: string;
}

export interface UnitsImportResult {
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

async function ready() {
  const actor = await getActor();
  if (!actor) throw new ActionError("signedOut");
  await assertCanWrite(actor, "content:import", platformTarget);
  try {
    return await getStorage();
  } catch (e) {
    if (e instanceof StorageNotConnectedError) throw new ActionError("driveNotConnected");
    throw e;
  }
}

/**
 * Step 1: find the unit files (one JSON file per unit) in the Drive folder the Owner links, or
 * in /LinguaPath/01_Content/Units, subfolders included. Nothing is read or saved yet.
 */
export async function listUnitFiles(folderInput: string): Promise<ActionResult<UnitFile[]>> {
  return runAction(async () => {
    const drive = await ready();
    const folder = folderIdFrom(folderInput) ?? (await findLayoutFolder(drive, UNITS_FOLDER));
    if (!folder) throw new ActionError("unitsFolderMissing");
    let listed;
    try {
      listed = await listRecursive(drive, folder);
    } catch {
      throw new ActionError("unitsFolderMissing");
    }
    const json = listed.filter((f) => f.file.name.toLowerCase().endsWith(".json"));
    // A course folder also holds other JSON (an index, rubrics, a schema). When its unit files
    // are named "unit…", only those are read; otherwise every JSON file is tried.
    const named = json.filter((f) => /^unit[\w-]*\.json$/i.test(f.file.name));
    const files = named.length > 0 ? named : json;
    if (files.length === 0) throw new ActionError("unitsNone");
    if (files.length > MAX_FILES) throw new ActionError("unitsTooMany");
    return files.map(({ path, file }) => ({ id: file.id, path }));
  });
}

/**
 * Step 2, repeated by the page a few files at a time: read, check and save. Good files are
 * saved, each broken one is reported with its reason, unchanged ones are left alone. Stopping
 * halfway loses nothing: running again skips what is already saved.
 */
export async function importUnitBatch(files: UnitFile[]): Promise<ActionResult<UnitsImportResult>> {
  return runAction(async () => {
    const drive = await ready();
    const batch = files.slice(0, BATCH);
    const db = await createClient();
    const result: UnitsImportResult = { imported: 0, unchanged: 0, issues: [] };
    const problem = (file: string, message: string) => {
      if (result.issues.length < MAX_ISSUES) result.issues.push({ file, message });
    };
    const raws = await Promise.all(
      batch.map(async ({ id, path }) => {
        try {
          return { path, raw: await new Response((await drive.stream(id)).body).text() };
        } catch {
          return { path, raw: null };
        }
      }),
    );
    const units = [];
    for (const { path, raw } of raws) {
      if (raw === null) {
        problem(path, "could not be read from Drive");
        continue;
      }
      let json: unknown;
      try {
        json = JSON.parse(raw.replace(/^\uFEFF/, ""));
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
      const hash = createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex");
      units.push({ unit: parsed.data, hash });
    }
    const { data: existing } = await db
      .from("course_units")
      .select("id, hash")
      .in("id", units.length ? units.map((u) => u.unit.id) : [""]);
    const known = new Map((existing ?? []).map((u) => [u.id, u.hash]));
    const rows = new Map<string, object>();
    for (const { unit, hash } of units) {
      if (known.get(unit.id) === hash) {
        result.unchanged++;
        continue;
      }
      rows.set(unit.id, {
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
    if (rows.size > 0)
      check(
        await db.from("course_units").upsert([...rows.values()] as never, { onConflict: "id" }),
      );
    result.imported = rows.size;
    return result;
  });
}

/**
 * Step 3: register the files in /LinguaPath/02_Media so units can play their recorded audio
 * (a file named after the item it belongs to, e.g. "LS-A1-U01-VOC01.mp3").
 */
export async function linkUnitAudio(): Promise<ActionResult<{ files: number }>> {
  return runAction(async () => {
    const drive = await ready();
    const db = await createClient();
    const media = await syncMediaAssets(db, await listMedia(drive));
    revalidatePath("/[locale]/owner/content", "page");
    return { files: media.size };
  });
}
