import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canSomewhere } from "@/lib/auth/can";
import { getActor } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { isVisible } from "@/lib/visibility/server";

/**
 * GET /api/media/<media_assets.id> — streams a file from Drive 02_Media (SPEC §5).
 * Only files registered by the content sync can be served (never arbitrary Drive ids),
 * after permission + department-visibility checks. Supports Range for audio/video seeking.
 */
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest, { params }: RouteContext<"/api/media/[id]">) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success)
    return new NextResponse(null, { status: 404, headers: NO_STORE });

  const actor = await getActor();
  if (!actor) return new NextResponse(null, { status: 401, headers: NO_STORE });
  if (
    !(await canSomewhere(actor, "content:view")) &&
    !(await canSomewhere(actor, "learning:self"))
  ) {
    return new NextResponse(null, { status: 403, headers: NO_STORE });
  }

  const db = await createClient();
  const { data: asset } = await db
    .from("media_assets")
    .select("id, drive_file_id, mime_type, drive_modified_at, status")
    .eq("id", id)
    .maybeSingle();
  if (!asset || asset.status !== "active")
    return new NextResponse(null, { status: 404, headers: NO_STORE });

  // Hidden departments hide their media too: if every department using this file is hidden, 404.
  const [lessons, items] = await Promise.all([
    db.from("lessons").select("departments(code)").eq("media_asset_id", id),
    db.from("items").select("departments(code)").eq("media_asset_id", id),
  ]);
  const departments = new Set(
    [...(lessons.data ?? []), ...(items.data ?? [])].flatMap((r) =>
      r.departments ? [r.departments.code] : [],
    ),
  );
  if (departments.size > 0) {
    let anyVisible = false;
    for (const code of departments)
      if (await isVisible(actor, `department.${code}`)) anyVisible = true;
    if (!anyVisible) return new NextResponse(null, { status: 404, headers: NO_STORE });
  }

  const etag = `"${asset.id}-${asset.drive_modified_at ?? "0"}"`;
  if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304 });

  const storage = await getStorage();
  const file = await storage.stream(asset.drive_file_id, request.headers.get("range"));
  const headers: Record<string, string> = {
    "Content-Type": asset.mime_type || file.contentType,
    "Accept-Ranges": "bytes",
    ETag: etag,
    // Content-library media is not personal data and ids are random: let the CDN cache it (SPEC §5).
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    // Neutralise scripts inside SVG/HTML files served from our origin.
    "Content-Security-Policy":
      "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
  };
  if (file.contentLength !== null) headers["Content-Length"] = String(file.contentLength);
  if (file.contentRange) headers["Content-Range"] = file.contentRange;
  return new NextResponse(file.body, { status: file.status, headers });
}
