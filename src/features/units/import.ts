"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ActionError, type ActionResult, check, runAction } from "@/lib/action-result";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { getStorage, StorageNotConnectedError } from "@/lib/storage";
import { listMedia, syncMediaAssets } from "@/features/content/import/drive-source";
import { addFolderMedia } from "@/features/content/import/external-media";
import { findLayoutFolder, listRecursive } from "@/lib/storage/layout";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/db";
import { mockSchema } from "@/features/mocks/schema";
import { saveMocks } from "./save-mocks";
import { STEP_BOOKLET, STEP_MOCK, unitDocsIn } from "./read-file";
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
    // The STEP Foundation pack: its booklet part files (Word) hold the lessons.
    const step = listed.filter(
      (f) => STEP_BOOKLET.test(f.file.name) || STEP_MOCK.test(f.file.name),
    );
    if (step.length > 0) return step.map(({ path, file }) => ({ id: file.id, path }));
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
          const bytes = await new Response((await drive.stream(id)).body).arrayBuffer();
          return { path, raw: new Uint8Array(bytes) };
        } catch {
          return { path, raw: null };
        }
      }),
    );
    const units = [];
    const mocks = [];
    for (const { path, raw } of raws) {
      if (raw === null) {
        problem(path, "could not be read from Drive");
        continue;
      }
      const read = unitDocsIn(path, raw);
      if ("problem" in read) {
        problem(path, read.problem);
        continue;
      }
      if (read.mock) {
        const parsed = mockSchema.safeParse(read.mock);
        if (parsed.success) mocks.push(parsed.data);
        else problem(path, `mock: ${parsed.error.issues[0]?.message ?? "invalid"}`);
      }
      for (const json of read.docs) {
        const parsed = unitSchema.safeParse(json);
        if (!parsed.success) {
          const first = parsed.error.issues[0];
          problem(path, `${first?.path.join(".") || "file"}: ${first?.message ?? "invalid"}`);
          continue;
        }
        const hash = createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex");
        units.push({ unit: parsed.data, hash });
      }
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
    result.imported = rows.size + (await saveMocks(db, mocks, result));
    return result;
  });
}

/**
 * Step 3: register the files in /LinguaPath/02_Media so units can play their recorded audio
 * (a file named after the item it belongs to, e.g. "LS-A1-U01-VOC01.mp3"), and the audio and
 * pictures inside the linked folder itself (a pack such as STEP keeps its MP3s beside its files).
 */
export async function linkUnitAudio(folderInput = ""): Promise<ActionResult<{ files: number }>> {
  return runAction(async () => {
    const drive = await ready();
    const db = await createClient();
    const media = await syncMediaAssets(db, await listMedia(drive));
    const folder = folderIdFrom(folderInput) ?? (await findLayoutFolder(drive, UNITS_FOLDER));
    const own = folder ? await addFolderMedia(db, drive, folder) : 0;
    revalidatePath("/[locale]/owner/content", "page");
    return { files: media.size + own };
  });
}
