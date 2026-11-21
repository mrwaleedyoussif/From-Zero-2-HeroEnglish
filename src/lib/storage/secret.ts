import "server-only";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret } from "./crypto";

/**
 * The Owner's Google refresh token, encrypted in `integration_secrets` (SPEC §5).
 * Only the service role can read that table; callers must have checked
 * `integrations:manage` (writes) or be server code that needs Drive (reads).
 */
const PROVIDER = "google";

export interface GoogleConnection {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
  source: "database" | "env" | null;
}

export async function saveGoogleToken(input: {
  refreshToken: string;
  email: string | null;
  scopes: string[];
  connectedBy: string;
}): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("integration_secrets").upsert(
    {
      provider: PROVIDER,
      ciphertext: encryptSecret(input.refreshToken, serverEnv().ENCRYPTION_KEY),
      account_email: input.email,
      scopes: input.scopes,
      connected_by: input.connectedBy,
    },
    { onConflict: "provider" },
  );
  if (error) throw new Error("Could not save the Google connection", { cause: error });
}

export async function deleteGoogleToken(): Promise<void> {
  const { error } = await createAdminClient()
    .from("integration_secrets")
    .delete()
    .eq("provider", PROVIDER);
  if (error) throw new Error("Could not remove the Google connection", { cause: error });
}

/** Stored token first; GOOGLE_REFRESH_TOKEN env is a fallback (scripts, first deploy). */
export async function loadGoogleToken(): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("integration_secrets")
    .select("ciphertext")
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (data?.ciphertext) return decryptSecret(data.ciphertext, serverEnv().ENCRYPTION_KEY);
  return serverEnv().GOOGLE_REFRESH_TOKEN ?? null;
}

export async function googleConnection(): Promise<GoogleConnection> {
  const { data } = await createAdminClient()
    .from("integration_secrets")
    .select("account_email, updated_at")
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (data)
    return {
      connected: true,
      email: data.account_email,
      connectedAt: data.updated_at,
      source: "database",
    };
  if (serverEnv().GOOGLE_REFRESH_TOKEN)
    return { connected: true, email: null, connectedAt: null, source: "env" };
  return { connected: false, email: null, connectedAt: null, source: null };
}
