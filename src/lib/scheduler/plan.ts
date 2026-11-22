/**
 * Report schedule (SPEC §12), pure: per-school time zone and week start. Weekly reports are due
 * from 06:00 local on the first day of the school week and cover the 7 days before it; monthly
 * reports from 06:00 on the 1st and cover the previous month. A missed tick catches up later.
 */

export const DUE_HOUR = 6;
const DAY = 86_400_000;

export interface LocalParts {
  date: string; // YYYY-MM-DD in the school's zone
  weekday: number; // 0 = Sunday
  hour: number;
}

export function localParts(now: Date, timeZone: string): LocalParts {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: days.indexOf(parts.weekday ?? "Sun"),
    hour: Number(parts.hour),
  };
}

export const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** Last day of a report period starting on `start` (a Sunday… or the 1st of a month). */
export function periodEnd(period: "weekly" | "monthly", start: string): string {
  if (period === "weekly") return addDays(start, 6);
  const [y, m] = start.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export interface Period {
  period: "weekly" | "monthly";
  start: string;
  end: string;
}

/** The most recent complete school week whose report is due now. */
export function weeklyPeriod(now: Date, timeZone: string, weekStart: number): Period {
  const l = localParts(now, timeZone);
  const sinceStart = (l.weekday - weekStart + 7) % 7;
  const thisWeek = addDays(l.date, -sinceStart);
  const due = sinceStart > 0 || l.hour >= DUE_HOUR;
  // Before 06:00 on the first day, the last due report is still the previous one.
  const reportWeek = due ? thisWeek : addDays(thisWeek, -7);
  return {
    period: "weekly",
    start: addDays(reportWeek, -7),
    end: addDays(reportWeek, -1),
  };
}

/** The previous calendar month (in the school's zone). */
export function monthlyPeriod(now: Date, timeZone: string): Period {
  const l = localParts(now, timeZone);
  const [y, m, d] = l.date.split("-").map(Number) as [number, number, number];
  const due = d > 1 || l.hour >= DUE_HOUR;
  const back = due ? 1 : 2;
  const startMonth = new Date(Date.UTC(y, m - 1 - back, 1));
  const endMonth = new Date(Date.UTC(y, m - back, 0));
  return {
    period: "monthly",
    start: startMonth.toISOString().slice(0, 10),
    end: endMonth.toISOString().slice(0, 10),
  };
}

export interface QueuedEmail {
  id: string;
  priority: number;
  createdAt: string;
}

/**
 * Email budget guard: send up to the daily budget, most important recipients first
 * (lower priority number first, then oldest); the rest are deferred to tomorrow.
 */
export function splitByBudget<T extends QueuedEmail>(
  queue: readonly T[],
  sentToday: number,
  budget: number,
) {
  const left = Math.max(0, budget - sentToday);
  const ordered = [...queue].sort(
    (a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt),
  );
  return { send: ordered.slice(0, left), defer: ordered.slice(left) };
}

/** 00:05 UTC tomorrow: when deferred emails become due again. */
export function nextDay(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 5));
  return d;
}
