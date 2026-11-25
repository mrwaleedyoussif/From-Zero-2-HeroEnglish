import "server-only";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/** Limits per action (SPEC §15: rate limiting on auth and public routes). */
export const LIMITS = {
  /**
   * Student PIN sign-in: per school+username (PINs are short) and per IP. A whole school shares
   * one public IP, so the IP limit must fit every class signing in during the same lesson.
   */
  pinIp: { max: 600, windowSec: 15 * 60 },
  pinUser: { max: 8, windowSec: 15 * 60 },
  /** Staff magic links: per IP and per email address (also protects the email budget). */
  linkIp: { max: 60, windowSec: 60 * 60 },
  linkEmail: { max: 10, windowSec: 60 * 60 },
  /** Staff password sign-in: few guesses per address, room for a school behind one IP. */
  passwordIp: { max: 100, windowSec: 15 * 60 },
  passwordEmail: { max: 8, windowSec: 15 * 60 },
  /** General learners: codes requested per email, and guesses at a code per email. */
  codeEmail: { max: 5, windowSec: 60 * 60 },
  codeTry: { max: 8, windowSec: 15 * 60 },
} as const;

/** Client IP as set by the hosting proxy (Vercel); "unknown" in local development. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Count a hit for each key; false as soon as one is over its limit. Fails open if the database
 * is unreachable, so an outage never locks everyone out (Supabase Auth has its own limits too).
 */
export async function allow(
  checks: { key: string; max: number; windowSec: number }[],
): Promise<boolean> {
  const db = createAdminClient();
  const factor = serverEnv().RATE_LIMIT_MULTIPLIER;
  for (const c of checks) {
    const { data, error } = await db.rpc("hit_rate_limit", {
      p_key: c.key,
      p_max: c.max * factor,
      p_window_sec: c.windowSec,
    });
    if (!error && data === false) return false;
  }
  return true;
}
