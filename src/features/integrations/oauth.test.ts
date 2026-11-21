import { describe, expect, it } from "vitest";
import { checkState, googleRedirectUri, missingScopes, packState } from "./oauth";

describe("Google OAuth helpers", () => {
  it("builds the callback URL (or uses the configured one)", () => {
    expect(googleRedirectUri("https://app.example.com/")).toBe(
      "https://app.example.com/api/integrations/google/callback",
    );
    expect(googleRedirectUri("https://x", "https://y/cb")).toBe("https://y/cb");
  });

  it("accepts only the state we issued and remembers the locale", () => {
    const state = packState("n".repeat(32), "ar");
    expect(checkState(state, state)).toEqual({ ok: true, locale: "ar" });
    expect(checkState(state, `${"m".repeat(32)}.ar`).ok).toBe(false);
    expect(checkState(undefined, state).ok).toBe(false);
    expect(checkState("short.en", "short.en").ok).toBe(false);
  });

  it("detects scopes the Owner unticked on Google's consent screen", () => {
    expect(
      missingScopes(
        "openid https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets.readonly email",
      ),
    ).toEqual([]);
    expect(missingScopes("openid https://www.googleapis.com/auth/drive")).toEqual([
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ]);
    expect(missingScopes(undefined)).toHaveLength(2);
  });
});
