import { renderToBuffer } from "@react-pdf/renderer";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CertificateDocument } from "@/features/rewards/certificate/document";
import { getActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/certificates/<id> — a learner's certificate as PDF, generated on request (nothing is
 * stored). RLS: the learner, or staff with rewards:view over them.
 */
export async function GET(_req: NextRequest, { params }: RouteContext<"/api/certificates/[id]">) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success)
    return new NextResponse(null, { status: 404, headers: PRIVATE });
  if (!(await getActor())) return new NextResponse(null, { status: 401, headers: PRIVATE });

  const db = await createClient();
  const { data: c } = await db
    .from("certificates")
    .select("id, kind, value, issued_at, student_id, departments(name_en)")
    .eq("id", id)
    .maybeSingle();
  if (!c) return new NextResponse(null, { status: 404, headers: PRIVATE });
  const [{ data: person }, { data: level }] = await Promise.all([
    db.from("profiles").select("full_name, schools(name_en)").eq("id", c.student_id).maybeSingle(),
    c.kind === "level"
      ? db.from("levels").select("name_en").eq("level", Number(c.value)).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const achievement =
    c.kind === "level"
      ? `Level ${c.value}${level ? ` — ${level.name_en}` : ""}`
      : `CEFR ${c.value}${c.departments ? ` in ${c.departments.name_en}` : ""}`;

  const pdf = await renderToBuffer(
    CertificateDocument({
      data: {
        studentName: person?.full_name ?? "",
        schoolName: person?.schools?.name_en ?? "",
        achievement,
        issuedOn: c.issued_at.slice(0, 10),
        id: c.id,
      },
    }),
  );
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      ...PRIVATE,
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificate-${c.kind}-${c.value}.pdf"`,
    },
  });
}
