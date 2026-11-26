import "server-only";
import type { StorageAdapter } from "@/lib/storage/types";
import { listRecursive } from "@/lib/storage/layout";
import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;
const MEDIA = /\.(mp3|m4a|wav|ogg|jpg|jpeg|png|webp|svg)$/i;

/**
 * Register the audio and pictures of a content pack's own Drive folder (e.g. the STEP pack's
 * 736 recordings), so units can play them without moving them into 02_Media. They are kept as
 * "external:<folder>" and are not marked missing by the 02_Media sync. Returns how many.
 */
export async function addFolderMedia(db: Db, drive: StorageAdapter, folderId: string) {
  const files = (await listRecursive(drive, folderId)).filter((f) => MEDIA.test(f.file.name));
  const now = new Date().toISOString();
  for (let i = 0; i < files.length; i += 200) {
    const { error } = await db.from("media_assets").upsert(
      files.slice(i, i + 200).map(({ path, file }) => ({
        file_name: file.name,
        drive_file_id: file.id,
        mime_type: file.mimeType,
        size_bytes: file.size,
        folder: `external:${folderId}${path.includes("/") ? `/${path.slice(0, path.lastIndexOf("/"))}` : ""}`,
        drive_modified_at: file.modifiedTime,
        status: "active",
        last_seen_at: now,
      })),
      { onConflict: "file_name" },
    );
    if (error) throw new Error("Could not save media list", { cause: error });
  }
  return files.length;
}
