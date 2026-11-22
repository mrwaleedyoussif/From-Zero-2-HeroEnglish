/**
 * Storage adapter (SPEC §5): the only door to Google Drive. Content, media, uploads,
 * reports and backups go through this interface; the "fake" driver serves a local
 * folder with the same layout for development and tests.
 */

export const FOLDER_MIME = "application/vnd.google-apps.folder";
export const SHEET_MIME = "application/vnd.google-apps.spreadsheet";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
}

export interface FileStream {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number | null;
  /** Set for 206 partial responses (audio/video seeking). */
  contentRange: string | null;
  status: 200 | 206;
}

export type ChildKind = "folder" | "sheet" | "file";

export interface StorageAdapter {
  readonly driver: "google" | "fake";
  /** A direct child by exact name ("root" = top of My Drive). */
  findChild(parentId: string, name: string, kind?: ChildKind): Promise<DriveFile | null>;
  /** Find or create a folder. */
  ensureFolder(parentId: string, name: string): Promise<DriveFile>;
  /** All direct children (every page). */
  list(folderId: string): Promise<DriveFile[]>;
  /** Cell values of the first tab of a Google Sheet, as text rows. */
  readSheet(fileId: string): Promise<string[][]>;
  getFile(fileId: string): Promise<DriveFile | null>;
  /** File bytes, optionally a byte range ("bytes=0-1023"). */
  stream(fileId: string, range?: string | null): Promise<FileStream>;
  upload(parentId: string, name: string, mimeType: string, body: Uint8Array): Promise<DriveFile>;
  /** Move a file to the Drive trash (backup retention). */
  remove(fileId: string): Promise<void>;
}

export class StorageNotConnectedError extends Error {
  constructor() {
    super("Google Drive is not connected yet");
    this.name = "StorageNotConnectedError";
  }
}

export class StorageNotFoundError extends Error {
  constructor(what: string) {
    super(`Not found in Drive: ${what}`);
    this.name = "StorageNotFoundError";
  }
}

export function isFolder(f: DriveFile): boolean {
  return f.mimeType === FOLDER_MIME;
}
