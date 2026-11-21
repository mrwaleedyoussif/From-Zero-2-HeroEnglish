import { OAuth2Client } from "google-auth-library";
import { type NextRequest, NextResponse } from "next/server";
import {
  checkState,
  googleRedirectUri,
  missingScopes,
  OAUTH_STATE_COOKIE,
} from "@/features/integrations/oauth";
import { can } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";
import { saveGoogleToken } from "@/lib/storage/secret";
import { createClient } from "@/lib/supabase/server";

/** Google → here with ?code&state. Stores the refresh token encrypted, then back to Integrations. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const { ok, locale } = checkState(
    request.cookies.get(OAUTH_STATE_COOKIE)?.value,
    params.get("state"),
  );
  const done = (query: string) => {
    const res = NextResponse.redirect(
      new URL(`/${locale}/owner/integrations?${query}`, request.nextUrl.origin),
    );
    res.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/api/integrations/google" });
    return res;
  };

  if (!ok) return done("error=state");
  if (params.get("error")) return done("error=denied");
  const code = params.get("code");
  if (!code) return done("error=state");

  const actor = await getActor();
  if (!actor || actor.viewAs || !(await can(actor, "integrations:manage", platformTarget))) {
    return done("error=forbidden");
  }
  const env = serverEnv();
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET)
    return done("error=not_configured");

  const client = new OAuth2Client({
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: googleRedirectUri(env.NEXT_PUBLIC_APP_URL, env.GOOGLE_OAUTH_REDIRECT_URI),
  });
  try {
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) return done("error=no_refresh_token");
    if (missingScopes(tokens.scope).length) return done("error=scopes");
    let email: string | null = null;
    if (tokens.id_token) {
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: env.GOOGLE_OAUTH_CLIENT_ID,
      });
      email = ticket.getPayload()?.email ?? null;
    }
    await saveGoogleToken({
      refreshToken: tokens.refresh_token,
      email,
      scopes: (tokens.scope ?? "").split(/\s+/).filter(Boolean),
      connectedBy: actor.real.id,
    });
    const db = await createClient();
    await db.rpc("log_audit", {
      p_action: "integration.google.connect",
      p_target_table: "integration_secrets",
      p_details: { email },
    });
    return done("connected=1");
  } catch (e) {
    console.error("Google OAuth callback failed", e);
    return done("error=exchange");
  }
}
