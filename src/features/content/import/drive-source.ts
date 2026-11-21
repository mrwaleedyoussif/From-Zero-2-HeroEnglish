import "server-only";
import {
  CONTENT_FOLDER,
  findLayoutFolder,
  listRecursive,
  MEDIA_FOLDER,
} from "@/lib/storage/layout";
import type { StorageAdapter } from "@/lib/storage/types";
import type { createClient } from "@/lib/supabase/server";
import type { RawSheets } from "./pipeline";
import { SHEETS } from "./sheets";

type Db = Awaited<ReturnType<typeof createClient>>;

export class ContentFolderMissingError extends Error {
  constructor() {
    super("/LinguaPath/01_Content not found in Drive");
    this.name = "ContentFolderMissingError";
  }
}

/** Read every content sheet from /LinguaPath/01_Content (null when a sheet doesn't exist). */
export async function readContentSheets(storage: StorageAdapter): Promise<RawSheets> {
  const folder = await findLayoutFolder(storage, CONTENT_FOLDER);
  if (!folder) throw new ContentFolderMissingError();
  const raw = {} as RawSheets;
  for (const { name } of SHEETS) {
    const file = await storage.findChild(folder, name, "sheet");
    raw[name] = file ? await storage.readSheet(file.id) : null;
  }
  return raw;
}

export interface MediaFile {
  name: string;
  folder: string;
  driveId: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
}

/** Every file in /LinguaPath/02_Media (any subfolder), by file name. */
export async function listMedia(storage: StorageAdapter): Promise<MediaFile[]> {
  const folder = await findLayoutFolder(storage, MEDIA_FOLDER);
  if (!folder) return [];
  const files = await listRecursive(storage, folder);
  const seen = new Set<string>();
  const out: MediaFile[] = [];
  for (const { path, file } of files) {
    if (seen.has(file.name)) continue; // names must be unique; first one wins
    seen.add(file.name);
    out.push({
      name: file.name,
      folder: path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "",
      driveId: file.id,
      mimeType: file.mimeType,
      size: file.size,
      modifiedTime: file.modifiedTime,
    });
  }
  return out;
}

/** Cache Drive file ids in media_assets (SPEC §5) and mark files that disappeared. Name → asset id. */
export async function syncMediaAssets(db: Db, media: MediaFile[]): Promise<Map<string, string>> {
  const now = new Date().toISOString();
  if (media.length) {
    const { error } = await db.from("media_assets").upsert(
      media.map((m) => ({
        file_name: m.name,
        drive_file_id: m.driveId,
        mime_type: m.mimeType,
        size_bytes: m.size,
        folder: m.folder,
        drive_modified_at: m.modifiedTime,
        status: "active",
        last_seen_at: now,
      })),
      { onConflict: "file_name" },
    );
    if (error) throw new Error("Could not save media list", { cause: error });
  }
  await db.from("media_assets").update({ status: "missing" }).lt("last_seen_at", now);
  const { data } = await db.from("media_assets").select("id, file_name").eq("status", "active");
  return new Map((data ?? []).map((a) => [a.file_name, a.id]));
}
