import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { checkBadges, recordLevelUps, totalXp } from "./award-extras";
import type { Level } from "./engine/levels";
import { type EventType, evaluateEvent, type RewardEvent, type RewardRule } from "./engine/rules";
import { emptyStreak, recordActivity, type StreakState } from "./engine/streaks";

type Admin = ReturnType<typeof createAdminClient>;

/** Events that count as "active today" for the streak. */
const ACTIVITY: ReadonlySet<EventType> = new Set([
  "lesson_completed",
  "placement_completed",
  "progress_completed",
]);

export interface AwardInput extends RewardEvent {
  studentId: string;
  /** Idempotency key: the same (student, type, key) is never awarded twice. */
  sourceKey: string;
  /** Badge filters (skill, cefr, format, department codes) and accuracy, kept with the event. */
  meta?: Record<string, string | number | null>;
}

export interface AwardOutcome {
  xp: number;
  coins: number;
  badges: string[];
  levels: Level[];
  streak: number | null;
}

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: AwardOutcome = { xp: 0, coins: 0, badges: [], levels: [], streak: null };

async function grant(
  admin: Admin,
  schoolId: string,
  input: AwardInput,
): Promise<{ xp: number; coins: number } | null> {
  const [{ data: rule }, { data: todays }] = await Promise.all([
    admin.from("reward_rules").select("*").eq("event_type", input.type).maybeSingle(),
    admin
      .from("xp_events")
      .select("xp")
      .eq("student_id", input.studentId)
      .eq("event_type", input.type)
      .gte("created_at", `${today()}T00:00:00Z`),
  ]);
  const xpToday = (todays ?? []).reduce((s, r) => s + r.xp, 0);
  const result = evaluateEvent(input, (rule as RewardRule | null) ?? undefined, xpToday);
  // The event is recorded even when blocked (it still counts for badges), with 0 XP.
  const { error } = await admin.from("xp_events").insert({
    student_id: input.studentId,
    school_id: schoolId,
    event_type: input.type,
    xp: result.xp,
    coins: result.coins,
    source_key: input.sourceKey,
    meta: { ...input.meta, accuracy: input.accuracy ?? null, blocked: result.blocked },
  });
  if (error) return null; // already awarded (unique source key)
  if (result.coins > 0)
    await admin.from("coin_ledger").insert({
      student_id: input.studentId,
      school_id: schoolId,
      delta: result.coins,
      reason: "earned",
    });
  return { xp: result.xp, coins: result.coins };
}

async function touchStreak(admin: Admin, studentId: string, schoolId: string) {
  const { data } = await admin
    .from("streaks")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  const state: StreakState = data
    ? {
        current: data.current,
        longest: data.longest,
        lastActiveOn: data.last_active_on,
        freezeWeek: data.freeze_week,
      }
    : emptyStreak;
  const update = recordActivity(state, today());
  if (!update.counted) return { current: state.current, counted: false };
  await admin.from("streaks").upsert({
    student_id: studentId,
    school_id: schoolId,
    current: update.state.current,
    longest: update.state.longest,
    last_active_on: update.state.lastActiveOn,
    freeze_week: update.state.freezeWeek,
  });
  return { current: update.state.current, counted: true };
}

/**
 * Award one learning event (SPEC §10): XP + coins by rule (anti-gaming, daily caps), streak day,
 * badges and level-ups. Server only, after the caller has checked who may cause the event.
 */
export async function award(admin: Admin, input: AwardInput): Promise<AwardOutcome> {
  const { data: p } = await admin
    .from("profiles")
    .select("school_id")
    .eq("id", input.studentId)
    .single();
  if (!p?.school_id) return EMPTY;
  const before = await totalXp(admin, input.studentId);
  const main = await grant(admin, p.school_id, input);
  if (!main) return EMPTY;
  let coins = main.coins;
  let streak: number | null = null;

  if (ACTIVITY.has(input.type)) {
    const s = await touchStreak(admin, input.studentId, p.school_id);
    streak = s.current;
    if (s.counted) {
      const day = await grant(admin, p.school_id, {
        studentId: input.studentId,
        type: "streak_day",
        sourceKey: today(),
      });
      coins += day?.coins ?? 0;
    }
  }
  const badges = await checkBadges(admin, input.studentId, p.school_id, streak ?? 0);
  const after = await totalXp(admin, input.studentId);
  const levels = await recordLevelUps(admin, input.studentId, p.school_id, before, after);
  return { xp: after - before, coins, badges, levels, streak };
}
