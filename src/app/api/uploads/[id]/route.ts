import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canSomewhere } from "@/lib/auth/can";
import { getActor } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/uploads/<productive_submissions.id> — a student's recorded speaking answer.
 * Private: RLS lets only the student and staff with placement:view_results over them read the
 * row; never cached by the CDN (SPEC §15: minors' uploads stay private).
 */
const PRIVATE = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest, { params }: RouteContext<"/api/uploads/[id]">) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success)
    return new NextResponse(null, { status: 404, headers: PRIVATE });
  const actor = await getActor();
  if (!actor) return new NextResponse(null, { status: 401, headers: PRIVATE });
  // Authorize twice (rule 1): the permission here, then RLS on the row below.
  if (
    !(await canSomewhere(actor, "placement:take")) &&
    !(await canSomewhere(actor, "placement:view_results"))
  )
    return new NextResponse(null, { status: 403, headers: PRIVATE });

  const db = await createClient();
  const { data: sub } = await db
    .from("productive_submissions")
    .select("drive_file_id, mime_type")
    .eq("id", id)
    .maybeSingle();
  if (!sub?.drive_file_id) return new NextResponse(null, { status: 404, headers: PRIVATE });

  const file = await (await getStorage()).stream(sub.drive_file_id, request.headers.get("range"));
  const headers: Record<string, string> = {
    ...PRIVATE,
    "Content-Type": sub.mime_type ?? file.contentType,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  };
  if (file.contentLength !== null) headers["Content-Length"] = String(file.contentLength);
  if (file.contentRange) headers["Content-Range"] = file.contentRange;
  return new NextResponse(file.body, { status: file.status, headers });
}
