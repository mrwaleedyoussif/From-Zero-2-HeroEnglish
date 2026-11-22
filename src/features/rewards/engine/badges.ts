/**
 * Badge rules (SPEC §10) are JSON data, e.g.
 *   {"event":"lesson_completed","count":5,"window_days":7,"where":{"skill":"LIST"}}  5 listening lessons in a week
 *   {"event":"placement_completed","where":{"cefr":"B1"}}                            first B1 placement
 *   {"event":"streak_day","count":30}                                                 30-day streak
 */
import { z } from "zod";
import { EVENT_TYPES, type EventType } from "./rules.ts";

export const badgeRule = z
  .object({
    event: z.enum(EVENT_TYPES),
    count: z.number().int().min(1).max(1000).default(1),
    window_days: z.number().int().min(1).max(366).optional(),
    min_accuracy: z.number().min(0).max(100).optional(),
    where: z
      .object({
        skill: z.string().max(20).optional(),
        cefr: z.string().max(10).optional(),
        format: z.string().max(20).optional(),
        department: z.string().max(20).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type BadgeRule = z.infer<typeof badgeRule>;

/** Parse a rule from the Badges sheet / DB; null when it isn't a valid rule. */
export function parseBadgeRule(raw: unknown): BadgeRule | null {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const r = badgeRule.safeParse(value);
  return r.success ? r.data : null;
}

export interface HistoryEvent {
  type: EventType;
  at: Date;
  accuracy?: number | null;
  skill?: string | null;
  cefr?: string | null;
  format?: string | null;
  department?: string | null;
}

export function ruleMet(
  rule: BadgeRule,
  history: readonly HistoryEvent[],
  streak: number,
  now: Date,
): boolean {
  if (rule.event === "streak_day") return streak >= rule.count;
  const since = rule.window_days ? now.getTime() - rule.window_days * 86_400_000 : -Infinity;
  const w = rule.where ?? {};
  const matching = history.filter(
    (e) =>
      e.type === rule.event &&
      e.at.getTime() >= since &&
      (rule.min_accuracy === undefined || (e.accuracy ?? 0) >= rule.min_accuracy) &&
      (!w.skill || e.skill === w.skill) &&
      (!w.cefr || e.cefr === w.cefr) &&
      (!w.format || e.format === w.format) &&
      (!w.department || e.department === w.department),
  );
  return matching.length >= rule.count;
}

/** Codes of badges newly earned (rules that hold now and weren't awarded before). */
export function newBadges(
  badges: readonly { code: string; rule: unknown }[],
  history: readonly HistoryEvent[],
  streak: number,
  already: ReadonlySet<string>,
  now: Date,
): string[] {
  return badges
    .filter((b) => !already.has(b.code))
    .filter((b) => {
      const rule = parseBadgeRule(b.rule);
      return rule !== null && ruleMet(rule, history, streak, now);
    })
    .map((b) => b.code);
}
