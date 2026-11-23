import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  access_token: z.string().min(20).max(4096),
  refresh_token: z.string().min(6).max(1024),
});

/**
 * Invitation emails can't carry a PKCE code: Supabase sends the invited person back with the
 * session tokens in the URL fragment, which only the browser sees. The sign-in page posts them
 * here; Supabase verifies them and the session becomes the same cookie as any other sign-in.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host"))
    return NextResponse.json({ ok: false }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.setSession(parsed.data);
  if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
