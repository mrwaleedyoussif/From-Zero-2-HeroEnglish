import { describe, expect, it } from "vitest";
import { EVENT_TYPES, evaluateEvent, type EventType, type RewardRule, scaleFactor } from "./rules";

const rule = (event_type: EventType, over: Partial<RewardRule> = {}): RewardRule => ({
  event_type,
  xp: 20,
  coins: 4,
  min_seconds: null,
  min_accuracy: null,
  daily_cap: null,
  scale: "none",
  active: true,
  ...over,
});

describe("reward rules: every event type", () => {
  it("lesson_completed scales by the lesson's CEFR level and needs time on task", () => {
    const r = rule("lesson_completed", { scale: "level", min_seconds: 60 });
    expect(evaluateEvent({ type: "lesson_completed", seconds: 120, level: 2 }, r, 0)).toEqual({
      xp: 30,
      coins: 6,
      blocked: null,
    });
    expect(evaluateEvent({ type: "lesson_completed", seconds: 10, level: 2 }, r, 0).blocked).toBe(
      "tooFast",
    );
    expect(evaluateEvent({ type: "lesson_completed", seconds: 60 }, r, 0).xp).toBe(20);
  });

  it("practice_accuracy scales by accuracy and needs a minimum accuracy", () => {
    const r = rule("practice_accuracy", { scale: "accuracy", min_accuracy: 50, xp: 10, coins: 2 });
    expect(evaluateEvent({ type: "practice_accuracy", accuracy: 80 }, r, 0)).toEqual({
      xp: 8,
      coins: 2,
      blocked: null,
    });
    expect(evaluateEvent({ type: "practice_accuracy", accuracy: 40 }, r, 0).blocked).toBe(
      "lowAccuracy",
    );
    expect(evaluateEvent({ type: "practice_accuracy" }, r, 0).blocked).toBe("lowAccuracy");
  });

  it("assignment_on_time, placement/progress, streak_day and team_challenge pay the base", () => {
    for (const type of [
      "assignment_on_time",
      "placement_completed",
      "progress_completed",
      "streak_day",
      "team_challenge",
    ] as const) {
      expect(evaluateEvent({ type }, rule(type), 0)).toEqual({ xp: 20, coins: 4, blocked: null });
    }
  });

  it("kudos are capped per day; a partial award keeps coins in proportion", () => {
    const r = rule("kudos", { xp: 10, coins: 4, daily_cap: 25 });
    expect(evaluateEvent({ type: "kudos" }, r, 0).xp).toBe(10);
    expect(evaluateEvent({ type: "kudos" }, r, 20)).toEqual({ xp: 5, coins: 2, blocked: null });
    expect(evaluateEvent({ type: "kudos" }, r, 25)).toEqual({
      xp: 0,
      coins: 0,
      blocked: "capReached",
    });
  });

  it("missing time or accuracy count as zero", () => {
    expect(
      evaluateEvent({ type: "lesson_completed" }, rule("lesson_completed", { min_seconds: 30 }), 0)
        .blocked,
    ).toBe("tooFast");
    expect(
      evaluateEvent(
        { type: "practice_accuracy" },
        rule("practice_accuracy", { scale: "accuracy" }),
        0,
      ).xp,
    ).toBe(0);
  });

  it("missing and switched-off rules award nothing", () => {
    expect(evaluateEvent({ type: "kudos" }, undefined, 0).blocked).toBe("noRule");
    expect(evaluateEvent({ type: "kudos" }, rule("kudos", { active: false }), 0).blocked).toBe(
      "inactive",
    );
  });

  it("knows every event type and clamps scale factors", () => {
    expect(EVENT_TYPES).toHaveLength(8);
    expect(
      scaleFactor(rule("lesson_completed", { scale: "level" }), {
        type: "lesson_completed",
        level: -3,
      }),
    ).toBe(1);
    expect(
      scaleFactor(rule("practice_accuracy", { scale: "accuracy" }), {
        type: "practice_accuracy",
        accuracy: 150,
      }),
    ).toBe(1);
  });
});
