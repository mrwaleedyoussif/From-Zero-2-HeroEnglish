import "server-only";
import { resolve } from "node:path";
import { serverEnv } from "@/lib/env";
import { createFakeStorage } from "./fake";
import { createGoogleStorage } from "./google";
import { loadGoogleToken } from "./secret";
import { type StorageAdapter, StorageNotConnectedError } from "./types";

export * from "./types";

/**
 * The storage adapter for this deployment. STORAGE_DRIVER=fake serves FAKE_DRIVE_DIR
 * (default supabase/fixtures/drive) — the DATA_TEMPLATES samples — for development and tests.
 */
export async function getStorage(): Promise<StorageAdapter> {
  const env = serverEnv();
  if (env.STORAGE_DRIVER === "fake") {
    return createFakeStorage(
      resolve(process.cwd(), env.FAKE_DRIVE_DIR ?? "supabase/fixtures/drive"),
    );
  }
  const refreshToken = await loadGoogleToken();
  if (!refreshToken || !env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
    throw new StorageNotConnectedError();
  }
  return createGoogleStorage({
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    refreshToken,
  });
}
