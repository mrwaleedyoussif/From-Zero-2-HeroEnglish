import { createReadStream } from "node:fs";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { extname, join, normalize, relative, sep } from "node:path";
import { Readable } from "node:stream";
import Papa from "papaparse";
import {
  type ChildKind,
  type DriveFile,
  FOLDER_MIME,
  type FileStream,
  SHEET_MIME,
  type StorageAdapter,
  StorageNotFoundError,
} from "./types";

/**
 * Local-folder driver with Drive's shape, for development and tests (STORAGE_DRIVER=fake).
 * Folders are directories; a Google Sheet is a `<Name>.csv` file (shown without ".csv").
 * File ids encode the relative path, so nothing outside the root can be addressed.
 */
const MIME: Record<string, string> = {
  ".csv": SHEET_MIME,
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
};

export function parseRange(
  range: string | null | undefined,
  size: number,
): { start: number; end: number } | null {
  const m = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
  if (!m || (m[1] === "" && m[2] === "")) return null;
  let start: number;
  let end: number;
  if (m[1] === "") {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  return start <= end && start < size ? { start, end } : null;
}

export function createFakeStorage(rootDir: string): StorageAdapter {
  const root = normalize(rootDir);
  const toId = (rel: string) => `fake_${Buffer.from(rel || ".").toString("base64url")}`;
  const toPath = (id: string): string => {
    if (id === "root") return root;
    if (!id.startsWith("fake_")) throw new StorageNotFoundError(id);
    const rel = Buffer.from(id.slice(5), "base64url").toString("utf8");
    const full = normalize(join(root, rel));
    if (full !== root && !full.startsWith(root + sep)) throw new StorageNotFoundError(id);
    return full;
  };

  async function describe(full: string): Promise<DriveFile | null> {
    const s = await stat(full).catch(() => null);
    if (!s) return null;
    const rel = relative(root, full);
    const ext = extname(full).toLowerCase();
    const isSheet = ext === ".csv";
    const base = full.split(sep).at(-1) ?? "";
    return {
      id: toId(rel),
      name: isSheet ? base.slice(0, -4) : base,
      mimeType: s.isDirectory() ? FOLDER_MIME : (MIME[ext] ?? "application/octet-stream"),
      size: s.isDirectory() ? null : s.size,
      modifiedTime: s.mtime.toISOString(),
    };
  }

  const matches = (f: DriveFile, kind?: ChildKind) =>
    !kind ||
    (kind === "folder"
      ? f.mimeType === FOLDER_MIME
      : kind === "sheet"
        ? f.mimeType === SHEET_MIME
        : f.mimeType !== FOLDER_MIME);

  const adapter: StorageAdapter = {
    driver: "fake",
    async list(folderId) {
      const dir = toPath(folderId);
      const names = await readdir(dir).catch(() => []);
      const files = await Promise.all(
        names.filter((n) => !n.startsWith(".")).map((n) => describe(join(dir, n))),
      );
      return files.filter((f): f is DriveFile => f !== null);
    },
    async findChild(parentId, name, kind) {
      return (
        (await adapter.list(parentId)).find((f) => f.name === name && matches(f, kind)) ?? null
      );
    },
    async ensureFolder(parentId, name) {
      const existing = await adapter.findChild(parentId, name, "folder");
      if (existing) return existing;
      const full = join(toPath(parentId), name);
      await mkdir(full, { recursive: true });
      const made = await describe(full);
      if (!made) throw new StorageNotFoundError(name);
      return made;
    },
    async getFile(fileId) {
      try {
        return await describe(toPath(fileId));
      } catch {
        return null;
      }
    },
    async readSheet(fileId) {
      const text = await readFile(toPath(fileId), "utf8");
      return Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: false }).data;
    },
    async stream(fileId, range) {
      const full = toPath(fileId);
      const info = await describe(full);
      if (!info || info.size === null) throw new StorageNotFoundError(fileId);
      const r = parseRange(range, info.size);
      const node = createReadStream(full, r ? { start: r.start, end: r.end } : {});
      const result: FileStream = {
        body: Readable.toWeb(node) as ReadableStream<Uint8Array>,
        contentType: info.mimeType,
        contentLength: r ? r.end - r.start + 1 : info.size,
        contentRange: r ? `bytes ${r.start}-${r.end}/${info.size}` : null,
        status: r ? 206 : 200,
      };
      return result;
    },
    async upload(parentId, name, _mimeType, body) {
      const full = join(toPath(parentId), name);
      await writeFile(full, body);
      const made = await describe(full);
      if (!made) throw new StorageNotFoundError(name);
      return made;
    },
    async remove(fileId) {
      await unlink(toPath(fileId));
    },
  };
  return adapter;
}
