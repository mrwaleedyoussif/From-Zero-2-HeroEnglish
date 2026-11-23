import { describe, expect, it } from "vitest";
import {
  addDays,
  isTimeZone,
  localParts,
  monthlyPeriod,
  nextDay,
  periodEnd,
  splitByBudget,
  weeklyPeriod,
} from "./plan";

const RIYADH = "Asia/Riyadh"; // UTC+3, no DST

describe("report schedule", () => {
  it("tells real time zones from free text", () => {
    expect(isTimeZone(RIYADH)).toBe(true);
    expect(isTimeZone("Riyadh")).toBe(false);
    expect(isTimeZone("GMT+3")).toBe(false);
  });
  it("reads the local date, weekday and hour in the school's zone", () => {
    expect(localParts(new Date("2026-11-21T22:30:00Z"), RIYADH)).toEqual({
      date: "2026-11-22",
      weekday: 0,
      hour: 1,
    });
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(periodEnd("weekly", "2026-11-15")).toBe("2026-11-21");
    expect(periodEnd("monthly", "2026-02-01")).toBe("2026-02-28");
    expect(periodEnd("monthly", "2026-12-01")).toBe("2026-12-31");
  });

  it("weekly: from 06:00 on the first school day, report the week before", () => {
    // Sunday 22 Nov 2026, 06:30 Riyadh → week of 15–21 Nov.
    expect(weeklyPeriod(new Date("2026-11-22T03:30:00Z"), RIYADH, 0)).toMatchObject({
      start: "2026-11-15",
      end: "2026-11-21",
    });
    // Sunday 05:00 Riyadh: not yet → the previous report period (8–14 Nov).
    expect(weeklyPeriod(new Date("2026-11-22T02:00:00Z"), RIYADH, 0)).toMatchObject({
      start: "2026-11-08",
      end: "2026-11-14",
    });
    // Wednesday: still the week of 15–21 Nov (catch-up after missed ticks).
    expect(weeklyPeriod(new Date("2026-11-25T12:00:00Z"), RIYADH, 0)).toMatchObject({
      start: "2026-11-15",
    });
    // A school whose week starts on Monday (1).
    expect(weeklyPeriod(new Date("2026-11-23T05:00:00Z"), RIYADH, 1)).toMatchObject({
      start: "2026-11-16",
      end: "2026-11-22",
    });
  });

  it("monthly: from 06:00 on the 1st, report the previous month", () => {
    expect(monthlyPeriod(new Date("2026-12-01T04:00:00Z"), RIYADH)).toMatchObject({
      start: "2026-11-01",
      end: "2026-11-30",
    });
    expect(monthlyPeriod(new Date("2026-12-01T01:00:00Z"), RIYADH)).toMatchObject({
      start: "2026-10-01",
      end: "2026-10-31",
    });
    expect(monthlyPeriod(new Date("2026-03-15T12:00:00Z"), RIYADH)).toMatchObject({
      start: "2026-02-01",
      end: "2026-02-28",
    });
  });

  it("budget guard: most important recipients first, the rest deferred", () => {
    const q = [
      { id: "teacher", priority: 4, createdAt: "1" },
      { id: "principal", priority: 1, createdAt: "3" },
      { id: "coach", priority: 3, createdAt: "2" },
      { id: "vp", priority: 2, createdAt: "2" },
    ];
    expect(splitByBudget(q, 88, 90)).toEqual({ send: [q[1], q[3]], defer: [q[2], q[0]] });
    expect(splitByBudget(q, 95, 90).send).toEqual([]);
    expect(splitByBudget(q, 0, 90).defer).toEqual([]);
    expect(nextDay(new Date("2026-11-22T23:59:00Z")).toISOString()).toBe(
      "2026-11-23T00:05:00.000Z",
    );
  });
});
