/**
 * Reward rules (SPEC §10): an event earns XP and coins from its rule (data the Owner tunes).
 * Anti-gaming: minimum time on task and minimum accuracy, and a daily XP cap per event type.
 */

export const EVENT_TYPES = [
  "lesson_completed",
  "practice_accuracy",
  "assignment_on_time",
  "placement_completed",
  "progress_completed",
  "streak_day",
  "kudos",
  "team_challenge",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** How the base amount scales: by the lesson's CEFR level, by accuracy, or not at all. */
export type Scale = "none" | "level" | "accuracy";

export interface RewardRule {
  event_type: EventType;
  xp: number;
  coins: number;
  min_seconds: number | null;
  min_accuracy: number | null;
  daily_cap: number | null;
  scale: Scale;
  active: boolean;
}

export interface RewardEvent {
  type: EventType;
  seconds?: number | null;
  /** 0–100 */
  accuracy?: number | null;
  /** CEFR index of the lesson (0 = PreA1). */
  level?: number | null;
}

export type Blocked = "noRule" | "inactive" | "tooFast" | "lowAccuracy" | "capReached";

export interface Award {
  xp: number;
  coins: number;
  blocked: Blocked | null;
}

/** Each CEFR step above PreA1 adds a quarter of the base (A1 ×1.25 … C2 ×2.5). */
export const LEVEL_STEP = 0.25;

const none = (blocked: Blocked): Award => ({ xp: 0, coins: 0, blocked });

export function scaleFactor(rule: RewardRule, event: RewardEvent): number {
  if (rule.scale === "level") return 1 + LEVEL_STEP * Math.max(0, event.level ?? 0);
  if (rule.scale === "accuracy") return Math.min(100, Math.max(0, event.accuracy ?? 0)) / 100;
  return 1;
}

/**
 * XP and coins for one event. `xpToday` is the XP this learner already earned today from the
 * same event type (for the daily cap); a capped award keeps coins in proportion.
 */
export function evaluateEvent(
  event: RewardEvent,
  rule: RewardRule | undefined,
  xpToday: number,
): Award {
  if (!rule) return none("noRule");
  if (!rule.active) return none("inactive");
  if (rule.min_seconds !== null && (event.seconds ?? 0) < rule.min_seconds) return none("tooFast");
  if (rule.min_accuracy !== null && (event.accuracy ?? 0) < rule.min_accuracy)
    return none("lowAccuracy");

  const factor = scaleFactor(rule, event);
  let xp = Math.round(rule.xp * factor);
  let coins = Math.round(rule.coins * factor);
  if (rule.daily_cap !== null) {
    const left = rule.daily_cap - xpToday;
    if (left <= 0) return none("capReached");
    if (xp > left) {
      coins = Math.round((coins * left) / xp);
      xp = left;
    }
  }
  return { xp, coins, blocked: null };
}
