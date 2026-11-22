/**
 * Daily activity streaks with one "freeze" per week (SPEC §10): missing a single day keeps the
 * streak if the week of that missed day hasn't used its freeze yet. Dates are UTC YYYY-MM-DD.
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

export interface StreakUpdate {
  state: StreakState;
  /** First activity of the day: counts as a streak day. */
  counted: boolean;
  usedFreeze: boolean;
}

export function recordActivity(state: StreakState, today: string): StreakUpdate {
  if (state.lastActiveOn === today) return { state, counted: false, usedFreeze: false };
  const gap =
    state.lastActiveOn === null ? Infinity : (toDay(today) - toDay(state.lastActiveOn)) / DAY;
  if (gap < 0) return { state, counted: false, usedFreeze: false }; // clock went backwards

  let current = 1;
  let freezeWeek = state.freezeWeek;
  let usedFreeze = false;
  if (gap === 1) current = state.current + 1;
  else if (gap === 2) {
    const missedWeek = weekStart(fromDay(toDay(today) - DAY));
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
export function shownStreak(state: StreakState, today: string): number {
  if (!state.lastActiveOn) return 0;
  const gap = (toDay(today) - toDay(state.lastActiveOn)) / DAY;
  if (gap <= 1) return state.current;
  if (gap === 2 && state.freezeWeek !== weekStart(fromDay(toDay(today) - DAY)))
    return state.current;
  return 0;
}
