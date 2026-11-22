import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exportStudent } from "@/features/privacy/student-data";
import { can } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const PRIVATE = { "Cache-Control": "private, no-store" };

/** GET /api/students/<id>/export — everything stored about a student, as JSON (Owner only, audited). */
export async function GET(
  _req: NextRequest,
  { params }: RouteContext<"/api/students/[id]/export">,
) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success)
    return new NextResponse(null, { status: 404, headers: PRIVATE });
  const actor = await getActor();
  if (!actor) return new NextResponse(null, { status: 401, headers: PRIVATE });
  if (!(await can(actor, "users:edit", platformTarget)))
    return new NextResponse(null, { status: 403, headers: PRIVATE });
  const admin = createAdminClient();
  const data = await exportStudent(admin, id);
  if (!data) return new NextResponse(null, { status: 404, headers: PRIVATE });
  await admin.from("audit_log").insert({
    actor_id: actor.real.id,
    action: "student.export",
    target_table: "profiles",
    target_id: id,
  });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      ...PRIVATE,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="student-${id}.json"`,
    },
  });
}
