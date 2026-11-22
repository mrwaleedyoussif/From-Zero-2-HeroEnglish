/**
 * Kagan team points (SPEC §10): the sum of each member's improvement over their own baseline,
 * not raw scores — so every member, at any level, can contribute equally.
 */

export interface MemberScores {
  /** Average practice accuracy (0–100) before this week, or null if none. */
  baseline: number | null;
  /** Average practice accuracy (0–100) this week, or null if no practice yet. */
  current: number | null;
}

/** Points for one member: gain over baseline; a first week of practice earns a flat start. */
export const FIRST_WEEK_POINTS = 5;

export function memberImprovement({ baseline, current }: MemberScores): number {
  if (current === null) return 0;
  if (baseline === null) return FIRST_WEEK_POINTS;
  return Math.max(0, Math.round(current - baseline));
}

export function teamPoints(members: readonly MemberScores[], challengeXp = 0): number {
  return members.reduce((sum, m) => sum + memberImprovement(m), 0) + Math.max(0, challengeXp);
}

export const average = (values: readonly number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
