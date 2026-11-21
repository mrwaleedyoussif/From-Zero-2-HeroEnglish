import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link and Google sign-in land here with a PKCE `code`.
 * Accounts without an active profile (e.g. a random Google user) are signed out again:
 * staff accounts only come from invites or imports.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const requested = searchParams.get("locale");
  const locale = routing.locales.find((l) => l === requested) ?? routing.defaultLocale;
  const code = searchParams.get("code");
  const fail = (error: string) =>
    NextResponse.redirect(new URL(`/${locale}/login?error=${error}`, origin));

  if (!code) return fail("link_invalid");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail("link_invalid");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    return fail("no_account");
  }
  return NextResponse.redirect(new URL(`/${locale}/home`, origin));
}
