/**
 * The platform's wall-clock zone (DEFAULT_TIMEZONE, Asia/Riyadh by default): times typed into
 * forms and times shown on screen mean this zone, not the server's (UTC).
 */
export function appTimeZone(): string {
  return process.env.DEFAULT_TIMEZONE?.trim() || "Asia/Riyadh";
}

/** How far `timeZone` is ahead of UTC at that instant, in milliseconds. */
function offsetMs(at: Date, timeZone: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((x) => [x.type, Number(x.value)]),
  );
  const wall = Date.UTC(
    p.year ?? 0,
    (p.month ?? 1) - 1,
    p.day ?? 1,
    p.hour ?? 0,
    p.minute ?? 0,
    p.second ?? 0,
  );
  return wall - at.getTime();
}

/** "2026-11-23T08:00" typed as local time in `timeZone` → that instant. */
export function zonedTimeToUtc(local: string, timeZone = appTimeZone()): Date {
  const asUtc = new Date(`${local.slice(0, 16)}:00Z`);
  return new Date(asUtc.getTime() - offsetMs(asUtc, timeZone));
}
