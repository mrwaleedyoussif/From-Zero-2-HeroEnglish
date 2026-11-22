import { describe, expect, it } from "vitest";
import { average, memberImprovement, teamPoints } from "./kagan";
import { leaderboard, rankAll } from "./leaderboard";
import { type Level, levelFor, levelsCrossed } from "./levels";
import { emptyStreak, recordActivity, shownStreak, weekStart } from "./streaks";

const levels: Level[] = [
  { level: 2, name_en: "Voyager", name_ar: "ر", xp_required: 100 },
  { level: 1, name_en: "Explorer", name_ar: "م", xp_required: 0 },
  { level: 3, name_en: "Navigator", name_ar: "م", xp_required: 300 },
];

describe("levels", () => {
  it("finds the level and progress to the next", () => {
    expect(levelFor(150, levels)).toMatchObject({
      current: { level: 2 },
      next: { level: 3 },
      progress: 0.25,
    });
    expect(levelFor(500, levels)).toMatchObject({ current: { level: 3 }, next: null, progress: 1 });
    expect(levelFor(50, levels.slice(0, 1))).toMatchObject({
      current: null,
      next: { level: 2 },
      progress: 0.5,
    });
    expect(levelFor(0, [])).toEqual({ current: null, next: null, progress: 1 });
  });

  it("lists levels crossed by an award", () => {
    expect(levelsCrossed(90, 320, levels).map((l) => l.level)).toEqual([2, 3]);
    expect(levelsCrossed(100, 120, levels)).toEqual([]);
  });
});

describe("streaks with a weekly freeze", () => {
  it("counts consecutive days once per day and tracks the longest", () => {
    let s = recordActivity(emptyStreak, "2026-11-16").state; // Monday
    expect(s).toMatchObject({ current: 1, longest: 1 });
    const same = recordActivity(s, "2026-11-16");
    expect(same.counted).toBe(false);
    s = recordActivity(s, "2026-11-17").state;
    expect(s.current).toBe(2);
    expect(recordActivity(s, "2026-11-15").counted).toBe(false); // clock went backwards
  });

  it("one missed day uses the week's freeze; a second in the same week breaks the streak", () => {
    let s = recordActivity(
      { ...emptyStreak, current: 3, longest: 3, lastActiveOn: "2026-11-16" },
      "2026-11-18",
    );
    expect(s).toMatchObject({ usedFreeze: true, state: { current: 4, freezeWeek: "2026-11-16" } });
    const broken = recordActivity(s.state, "2026-11-20");
    expect(broken).toMatchObject({ usedFreeze: false, state: { current: 1, longest: 4 } });
    s = recordActivity(s.state, "2026-11-25"); // gap of 7 days
    expect(s.state.current).toBe(1);
  });

  it("shows today's streak (kept through a freezable day, then 0)", () => {
    const st = { ...emptyStreak, current: 5, longest: 5, lastActiveOn: "2026-11-18" };
    expect(shownStreak(emptyStreak, "2026-11-18")).toBe(0);
    expect(shownStreak(st, "2026-11-19")).toBe(5);
    expect(shownStreak(st, "2026-11-20")).toBe(5);
    expect(shownStreak({ ...st, freezeWeek: "2026-11-16" }, "2026-11-20")).toBe(0);
    expect(shownStreak(st, "2026-11-22")).toBe(0);
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // Sunday → Monday before
  });
});

describe("leaderboards", () => {
  const entries = [
    { id: "a", points: 50 },
    { id: "b", points: 90 },
    { id: "c", points: 90 },
    { id: "d", points: 10 },
    { id: "e", points: 0 },
  ];

  it("ranks with ties and leaves out learners without points", () => {
    expect(rankAll(entries).map((r) => [r.id, r.rank])).toEqual([
      ["b", 1],
      ["c", 1],
      ["a", 3],
      ["d", 4],
    ]);
  });

  it("shows the top N and my rank only in the top half (never bottom ranks)", () => {
    expect(leaderboard(entries, "a", 2)).toMatchObject({
      top: [{ id: "b" }, { id: "c" }],
      me: { rank: null, points: 50 },
    });
    expect(leaderboard(entries, "c").me).toEqual({ points: 90, rank: 1 });
    expect(leaderboard(entries, "d").me).toEqual({ points: 10, rank: null });
    expect(leaderboard(entries, "e").me).toEqual({ points: 0, rank: null });
    expect(leaderboard(entries, null).me).toBeNull();
  });
});

describe("Kagan team points", () => {
  it("sum members' improvement over their own baseline, plus team challenge XP", () => {
    expect(memberImprovement({ baseline: 60, current: 75.4 })).toBe(15);
    expect(memberImprovement({ baseline: 80, current: 70 })).toBe(0);
    expect(memberImprovement({ baseline: null, current: 50 })).toBe(5);
    expect(memberImprovement({ baseline: 50, current: null })).toBe(0);
    expect(
      teamPoints(
        [
          { baseline: 60, current: 70 },
          { baseline: null, current: 40 },
        ],
        20,
      ),
    ).toBe(35);
    expect(teamPoints([], -5)).toBe(0);
    expect(average([])).toBeNull();
    expect(average([50, 70])).toBe(60);
  });
});
