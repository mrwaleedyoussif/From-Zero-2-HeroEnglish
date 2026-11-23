/**
 * Daily activity streaks with one "freeze" per week (SPEC §10): missing a single day keeps the
 * streak if the week of that missed day hasn't used its freeze yet. Weekend days never count
 * as missed, so a streak carries over the weekend. Dates are calendar days (YYYY-MM-DD).
 */

export interface StreakState {
  current: number;
  longest: number;
  lastActiveOn: string | null;
  /** Monday (YYYY-MM-DD) of the week whose freeze was used, if any. */
  freezeWeek: string | null;
}

export const emptyStreak: StreakState = {
  current: 0,
  longest: 0,
  lastActiveOn: null,
  freezeWeek: null,
};

const DAY = 86_400_000;
const toDay = (s: string) => Date.parse(`${s}T00:00:00Z`);
const fromDay = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Monday of the (ISO) week containing the date. */
export function weekStart(day: string): string {
  const t = toDay(day);
  const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday = 0
  return fromDay(t - dow * DAY);
}

/** The school's two weekend days (0 = Sunday), from the first day of its week. */
export function weekendDays(weekStartsOn: number): ReadonlySet<number> {
  return new Set([(weekStartsOn + 5) % 7, (weekStartsOn + 6) % 7]);
}

const NO_REST: ReadonlySet<number> = new Set();

/** School days strictly between two days (stops after two: that already breaks a streak). */
function missedDays(from: string, to: string, rest: ReadonlySet<number>): string[] {
  const out: string[] = [];
  for (let t = toDay(from) + DAY; t < toDay(to) && out.length < 2; t += DAY)
    if (!rest.has(new Date(t).getUTCDay())) out.push(fromDay(t));
  return out;
}

export interface StreakUpdate {
  state: StreakState;
  /** First activity of the day: counts as a streak day. */
  counted: boolean;
  usedFreeze: boolean;
}

export function recordActivity(
  state: StreakState,
  today: string,
  rest: ReadonlySet<number> = NO_REST,
): StreakUpdate {
  if (state.lastActiveOn === today) return { state, counted: false, usedFreeze: false };
  if (state.lastActiveOn !== null && toDay(today) < toDay(state.lastActiveOn))
    return { state, counted: false, usedFreeze: false }; // clock went backwards

  let current = 1;
  let freezeWeek = state.freezeWeek;
  let usedFreeze = false;
  const missed = state.lastActiveOn === null ? null : missedDays(state.lastActiveOn, today, rest);
  if (missed?.length === 0) current = state.current + 1;
  else if (missed?.length === 1) {
    const missedWeek = weekStart(missed[0] as string);
    if (freezeWeek !== missedWeek) {
      current = state.current + 1;
      freezeWeek = missedWeek;
      usedFreeze = true;
    }
  }
  return {
    state: { current, longest: Math.max(state.longest, current), lastActiveOn: today, freezeWeek },
    counted: true,
    usedFreeze,
  };
}

/** The streak as shown today: broken (0) once more than a freezable day has been missed. */
export function shownStreak(
  state: StreakState,
  today: string,
  rest: ReadonlySet<number> = NO_REST,
): number {
  if (!state.lastActiveOn) return 0;
  const missed = missedDays(state.lastActiveOn, today, rest);
  if (missed.length === 0) return state.current;
  if (missed.length === 1 && state.freezeWeek !== weekStart(missed[0] as string))
    return state.current;
  return 0;
}
