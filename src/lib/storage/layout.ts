import type { StorageAdapter } from "./types";

/** Drive folder layout (SPEC §5), created by `npm run drive:init` or the Integrations page. */
export const DRIVE_ROOT = "LinguaPath";

export const LAYOUT = [
  "00_Config",
  "01_Content",
  "02_Media",
  "02_Media/audio",
  "02_Media/images",
  "02_Media/video",
  "02_Media/docs",
  "03_Uploads",
  "04_Reports",
  "05_Archive",
  "05_Archive/responses",
  "06_Backups",
  "06_Backups/db",
] as const;

export const CONTENT_FOLDER = "01_Content";
export const MEDIA_FOLDER = "02_Media";

/** Create every folder that is missing; returns path → folder id. Safe to re-run. */
export async function initLayout(storage: StorageAdapter): Promise<Record<string, string>> {
  const root = await storage.ensureFolder("root", DRIVE_ROOT);
  const ids: Record<string, string> = { [DRIVE_ROOT]: root.id };
  for (const path of LAYOUT) {
    const parts = path.split("/");
    const name = parts.at(-1) ?? path;
    const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
    const parentId = parentPath ? ids[parentPath] : root.id;
    if (!parentId) throw new Error(`Parent of ${path} missing`);
    ids[path] = (await storage.ensureFolder(parentId, name)).id;
  }
  return ids;
}

/** Folder id for a layout path like "01_Content", or null if it doesn't exist yet. */
export async function findLayoutFolder(
  storage: StorageAdapter,
  path: string,
): Promise<string | null> {
  let current = await storage.findChild("root", DRIVE_ROOT, "folder");
  for (const part of path.split("/")) {
    if (!current) return null;
    current = await storage.findChild(current.id, part, "folder");
  }
  return current?.id ?? null;
}

/** Every file below a folder, with its path relative to that folder (for 02_Media/**). */
export async function listRecursive(
  storage: StorageAdapter,
  folderId: string,
  prefix = "",
  depth = 0,
): Promise<{ path: string; file: Awaited<ReturnType<StorageAdapter["list"]>>[number] }[]> {
  if (depth > 4) return [];
  const out: { path: string; file: Awaited<ReturnType<StorageAdapter["list"]>>[number] }[] = [];
  for (const f of await storage.list(folderId)) {
    if (f.mimeType === "application/vnd.google-apps.folder") {
      out.push(...(await listRecursive(storage, f.id, `${prefix}${f.name}/`, depth + 1)));
    } else {
      out.push({ path: `${prefix}${f.name}`, file: f });
    }
  }
  return out;
}
