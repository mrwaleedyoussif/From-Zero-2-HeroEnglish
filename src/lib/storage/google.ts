import "server-only";
import { Readable } from "node:stream";
import { drive as driveApi } from "@googleapis/drive";
import { sheets as sheetsApi } from "@googleapis/sheets";
import { OAuth2Client } from "google-auth-library";
import { withBackoff } from "./backoff";
import {
  type ChildKind,
  type DriveFile,
  FOLDER_MIME,
  SHEET_MIME,
  type StorageAdapter,
  StorageNotFoundError,
} from "./types";

const FIELDS = "id, name, mimeType, size, modifiedTime";

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

/** Drive's query language needs quotes and backslashes escaped inside '…'. */
export function escapeQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function childQuery(parentId: string, name: string, kind?: ChildKind): string {
  const parts = [
    `'${escapeQuery(parentId)}' in parents`,
    `name = '${escapeQuery(name)}'`,
    "trashed = false",
  ];
  if (kind === "folder") parts.push(`mimeType = '${FOLDER_MIME}'`);
  if (kind === "sheet") parts.push(`mimeType = '${SHEET_MIME}'`);
  if (kind === "file") parts.push(`mimeType != '${FOLDER_MIME}'`);
  return parts.join(" and ");
}

type RawFile = {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  size?: string | null;
  modifiedTime?: string | null;
};

function toFile(f: RawFile): DriveFile {
  return {
    id: f.id ?? "",
    name: f.name ?? "",
    mimeType: f.mimeType ?? "application/octet-stream",
    size: f.size ? Number(f.size) : null,
    modifiedTime: f.modifiedTime ?? null,
  };
}

/** Google Drive driver: the Owner's OAuth refresh token (never a service account on a personal Drive). */
export function createGoogleStorage(creds: GoogleCredentials): StorageAdapter {
  const auth = new OAuth2Client({ clientId: creds.clientId, clientSecret: creds.clientSecret });
  auth.setCredentials({ refresh_token: creds.refreshToken });
  const drive = driveApi({ version: "v3", auth });
  const sheets = sheetsApi({ version: "v4", auth });

  const adapter: StorageAdapter = {
    driver: "google",
    async findChild(parentId, name, kind) {
      const res = await withBackoff(() =>
        drive.files.list({
          q: childQuery(parentId, name, kind),
          fields: `files(${FIELDS})`,
          pageSize: 2,
          spaces: "drive",
        }),
      );
      const f = res.data.files?.[0];
      return f ? toFile(f) : null;
    },
    async ensureFolder(parentId, name) {
      const existing = await adapter.findChild(parentId, name, "folder");
      if (existing) return existing;
      const res = await withBackoff(() =>
        drive.files.create({
          requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
          fields: FIELDS,
        }),
      );
      return toFile(res.data);
    },
    async list(folderId) {
      const out: DriveFile[] = [];
      let pageToken: string | undefined;
      do {
        const res = await withBackoff(() =>
          drive.files.list({
            q: `'${escapeQuery(folderId)}' in parents and trashed = false`,
            fields: `nextPageToken, files(${FIELDS})`,
            pageSize: 1000,
            pageToken,
          }),
        );
        out.push(...(res.data.files ?? []).map(toFile));
        pageToken = res.data.nextPageToken ?? undefined;
      } while (pageToken);
      return out;
    },
    async readSheet(fileId) {
      // A range without a tab name means the first visible tab.
      const res = await withBackoff(() =>
        sheets.spreadsheets.values.get({
          spreadsheetId: fileId,
          range: "A1:ZZ",
          valueRenderOption: "FORMATTED_VALUE",
        }),
      );
      return (res.data.values ?? []).map((row) => row.map((c) => (c == null ? "" : String(c))));
    },
    async getFile(fileId) {
      try {
        const res = await withBackoff(() => drive.files.get({ fileId, fields: FIELDS }));
        return toFile(res.data);
      } catch {
        return null;
      }
    },
    async stream(fileId, range) {
      const res = await withBackoff(() =>
        drive.files.get(
          { fileId, alt: "media" },
          { responseType: "stream", headers: range ? { Range: range } : {} },
        ),
      ).catch((e: unknown) => {
        throw Object.assign(new StorageNotFoundError(fileId), { cause: e });
      });
      const headers = res.headers as Record<string, string | undefined>;
      const length = headers["content-length"];
      return {
        body: Readable.toWeb(res.data as unknown as Readable) as ReadableStream<Uint8Array>,
        contentType: headers["content-type"] ?? "application/octet-stream",
        contentLength: length ? Number(length) : null,
        contentRange: headers["content-range"] ?? null,
        status: res.status === 206 ? 206 : 200,
      };
    },
    async upload(parentId, name, mimeType, body) {
      const res = await withBackoff(() =>
        drive.files.create({
          requestBody: { name, parents: [parentId] },
          media: { mimeType, body: Readable.from(Buffer.from(body)) },
          fields: FIELDS,
        }),
      );
      return toFile(res.data);
    },
    async remove(fileId) {
      // Trash, not delete: the Owner can still restore it from Drive for 30 days.
      await withBackoff(() => drive.files.update({ fileId, requestBody: { trashed: true } }));
    },
  };
  return adapter;
}
