import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canSomewhere } from "@/lib/auth/can";
import { getActor } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

const PRIVATE = { "Cache-Control": "private, no-store" };

/** GET /api/reports/<id>/pdf — the archived PDF from Drive, for whoever may read the report (RLS). */
export async function GET(_req: NextRequest, { params }: RouteContext<"/api/reports/[id]/pdf">) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success)
    return new NextResponse(null, { status: 404, headers: PRIVATE });
  const actor = await getActor();
  if (!actor) return new NextResponse(null, { status: 401, headers: PRIVATE });
  if (!(await canSomewhere(actor, "reports:view")))
    return new NextResponse(null, { status: 403, headers: PRIVATE });
  const { data } = await (
    await createClient()
  )
    .from("reports")
    .select("drive_file_id, period, period_start")
    .eq("id", id)
    .maybeSingle();
  if (!data?.drive_file_id) return new NextResponse(null, { status: 404, headers: PRIVATE });
  const file = await (await getStorage()).stream(data.drive_file_id);
  return new NextResponse(file.body, {
    headers: {
      ...PRIVATE,
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="linguapath-${data.period}-${data.period_start}.pdf"`,
    },
  });
}
