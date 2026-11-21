/**
 * Google OAuth for the Owner's Drive (SPEC §5). Pure helpers, unit-tested.
 * `drive` (full) is needed to read files the Owner made by hand; Sheets read-only for content.
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "openid",
  "email",
] as const;

export const OAUTH_STATE_COOKIE = "lp_google_oauth";

export function googleRedirectUri(appUrl: string, configured?: string): string {
  return configured ?? `${appUrl.replace(/\/$/, "")}/api/integrations/google/callback`;
}

/** The state cookie carries a random nonce + the locale to return to: "<nonce>.<locale>". */
export function packState(nonce: string, locale: string): string {
  return `${nonce}.${locale === "ar" ? "ar" : "en"}`;
}

export function checkState(
  cookie: string | undefined,
  param: string | null,
): { ok: boolean; locale: "en" | "ar" } {
  const locale = cookie?.endsWith(".ar") ? "ar" : "en";
  const ok = !!cookie && !!param && cookie.length >= 20 && cookie === param;
  return { ok, locale };
}

/** Every scope we asked for must have been granted (Google lets users untick some). */
export function missingScopes(granted: string | null | undefined): string[] {
  const have = new Set((granted ?? "").split(/\s+/).filter(Boolean));
  return GOOGLE_SCOPES.filter((s) => s.startsWith("https://") && !have.has(s));
}
