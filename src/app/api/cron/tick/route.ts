import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { runTick } from "@/lib/scheduler/tick";

export const maxDuration = 60; // the tick stops itself after 50 s
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** Constant-time check of "Authorization: Bearer <CRON_SECRET>" (or the x-cron-secret header). */
function authorized(req: NextRequest): boolean {
  const expected = Buffer.from(serverEnv().CRON_SECRET);
  const header =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-cron-secret") ??
    "";
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function tick(req: NextRequest, source: string) {
  if (!authorized(req))
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const result = await runTick(source);
  return NextResponse.json(result, { headers: NO_STORE });
}

/** Vercel Cron calls GET once a day with the secret as a Bearer token. */
export async function GET(req: NextRequest) {
  return tick(req, "vercel-cron");
}

/** The GitHub Actions ticker (every 15 minutes) and manual runs use POST. */
export async function POST(req: NextRequest) {
  return tick(req, req.headers.get("x-tick-source") === "github" ? "github-actions" : "manual");
}
