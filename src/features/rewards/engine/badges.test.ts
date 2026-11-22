import { describe, expect, it } from "vitest";
import { type HistoryEvent, newBadges, parseBadgeRule, ruleMet } from "./badges";

const now = new Date("2026-11-22T12:00:00Z");
const ago = (d: number) => new Date(now.getTime() - d * 86_400_000);
const lesson = (d: number, skill = "LIST", over: Partial<HistoryEvent> = {}): HistoryEvent => ({
  type: "lesson_completed",
  at: ago(d),
  skill,
  ...over,
});

describe("badge rules (JSON conditions)", () => {
  it("parses JSON strings and objects; rejects bad rules", () => {
    expect(parseBadgeRule('{"event":"streak_day","count":7}')).toEqual({
      event: "streak_day",
      count: 7,
    });
    expect(parseBadgeRule({ event: "kudos" })).toEqual({ event: "kudos", count: 1 });
    expect(parseBadgeRule("{not json")).toBeNull();
    expect(parseBadgeRule({ event: "flying" })).toBeNull();
    expect(parseBadgeRule({ event: "kudos", extra: 1 })).toBeNull();
  });

  it("counts events in a time window with filters (5 listening lessons in a week)", () => {
    const rule = {
      event: "lesson_completed" as const,
      count: 5,
      window_days: 7,
      where: { skill: "LIST" },
    };
    const four = [1, 2, 3, 4].map((d) => lesson(d));
    expect(ruleMet(rule, four, 0, now)).toBe(false);
    expect(ruleMet(rule, [...four, lesson(10)], 0, now)).toBe(false); // too old
    expect(ruleMet(rule, [...four, lesson(5, "GRAM")], 0, now)).toBe(false); // other skill
    expect(ruleMet(rule, [...four, lesson(6)], 0, now)).toBe(true);
  });

  it("matches CEFR, format, department and accuracy conditions", () => {
    const placed = {
      type: "placement_completed" as const,
      at: ago(1),
      cefr: "B1",
      department: "GEN",
    };
    expect(
      ruleMet({ event: "placement_completed", count: 1, where: { cefr: "B1" } }, [placed], 0, now),
    ).toBe(true);
    expect(
      ruleMet({ event: "placement_completed", count: 1, where: { cefr: "B2" } }, [placed], 0, now),
    ).toBe(false);
    expect(
      ruleMet(
        { event: "placement_completed", count: 1, where: { department: "MAP" } },
        [placed],
        0,
        now,
      ),
    ).toBe(false);
    const video = lesson(1, "READ", { format: "video", accuracy: 90 });
    expect(
      ruleMet({ event: "lesson_completed", count: 1, where: { format: "video" } }, [video], 0, now),
    ).toBe(true);
    expect(
      ruleMet({ event: "lesson_completed", count: 1, where: { format: "audio" } }, [video], 0, now),
    ).toBe(false);
    expect(
      ruleMet({ event: "lesson_completed", count: 1, min_accuracy: 95 }, [video], 0, now),
    ).toBe(false);
    expect(
      ruleMet({ event: "lesson_completed", count: 1, min_accuracy: 80 }, [lesson(1)], 0, now),
    ).toBe(false);
  });

  it("streak badges compare with the current streak", () => {
    expect(ruleMet({ event: "streak_day", count: 30 }, [], 29, now)).toBe(false);
    expect(ruleMet({ event: "streak_day", count: 30 }, [], 30, now)).toBe(true);
  });

  it("returns only badges not yet earned, skipping invalid rules", () => {
    const badges = [
      { code: "B-FIRST", rule: { event: "lesson_completed" } },
      { code: "B-OLD", rule: { event: "lesson_completed" } },
      { code: "B-BAD", rule: "nope" },
      { code: "B-STREAK-7", rule: '{"event":"streak_day","count":7}' },
    ];
    expect(newBadges(badges, [lesson(0)], 3, new Set(["B-OLD"]), now)).toEqual(["B-FIRST"]);
  });
});
