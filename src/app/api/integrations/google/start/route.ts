import { randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { type NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_SCOPES,
  googleRedirectUri,
  OAUTH_STATE_COOKIE,
  packState,
} from "@/features/integrations/oauth";
import { can } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";

/** Owner → Google consent screen (offline access so we get a refresh token). */
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en";
  const back = (error: string) =>
    NextResponse.redirect(
      new URL(`/${locale}/owner/integrations?error=${error}`, request.nextUrl.origin),
    );

  const actor = await getActor();
  if (!actor || actor.viewAs || !(await can(actor, "integrations:manage", platformTarget))) {
    return back("forbidden");
  }
  const env = serverEnv();
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) return back("not_configured");

  const state = packState(randomBytes(24).toString("base64url"), locale);
  const client = new OAuth2Client({
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: googleRedirectUri(env.NEXT_PUBLIC_APP_URL, env.GOOGLE_OAUTH_REDIRECT_URI),
  });
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // always return a refresh token, even on reconnect
    scope: [...GOOGLE_SCOPES],
    state,
    include_granted_scopes: true,
  });
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/google",
    maxAge: 600,
  });
  return res;
}
