import { describe, expect, it } from "vitest";
import { allowedBands, decideStart, elapsedSec, gradeBand, type StartFacts } from "./rules";

const NOW = new Date("2026-11-24T10:00:00Z");
const base: StartFacts = {
  kind: "placement",
  now: NOW,
  openSessionId: null,
  lastCompletedAt: null,
  cooldownDays: 30,
  hasUnusedRetake: false,
  openWindowId: null,
  doneInWindow: false,
};
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

describe("grade bands", () => {
  it.each([
    ["K", "K-2"],
    ["kg", "K-2"],
    ["2", "K-2"],
    ["4", "3-5"],
    ["8", "6-8"],
    ["12", "9-12"],
    ["13", null],
    ["Year 4", null],
    [null, null],
  ])("%s → %s", (code, band) => {
    expect(gradeBand(code)).toBe(band);
  });

  it("allows the learner's band and its neighbours", () => {
    expect([...(allowedBands("3-5") ?? [])]).toEqual(["K-2", "3-5", "6-8"]);
    expect([...(allowedBands("9-12") ?? [])]).toEqual(["6-8", "9-12"]);
    expect(allowedBands(null)).toBeNull();
  });
});

describe("placement start rules", () => {
  it("lets a first attempt start and always resumes an open session", () => {
    expect(decideStart(base)).toEqual({ ok: true, resume: null, windowId: null });
    expect(
      decideStart({ ...base, openSessionId: "s1", lastCompletedAt: daysAgo(1) }),
    ).toMatchObject({ ok: true, resume: "s1" });
  });

  it("needs the cooldown to pass AND a teacher's retake grant", () => {
    expect(decideStart({ ...base, lastCompletedAt: daysAgo(5), hasUnusedRetake: true })).toEqual({
      ok: false,
      reason: "cooldown",
      until: new Date(daysAgo(5).getTime() + 30 * 86_400_000),
    });
    expect(decideStart({ ...base, lastCompletedAt: daysAgo(40) })).toEqual({
      ok: false,
      reason: "needRetake",
    });
    expect(
      decideStart({ ...base, lastCompletedAt: daysAgo(40), hasUnusedRetake: true }),
    ).toMatchObject({ ok: true });
  });

  it("runs progress checks only inside an open window, once", () => {
    const progress = { ...base, kind: "progress" as const };
    expect(decideStart(progress)).toEqual({ ok: false, reason: "noWindow" });
    expect(decideStart({ ...progress, openWindowId: "w1", doneInWindow: true })).toEqual({
      ok: false,
      reason: "doneInWindow",
    });
    expect(decideStart({ ...progress, openWindowId: "w1" })).toEqual({
      ok: true,
      resume: null,
      windowId: "w1",
    });
  });

  it("counts elapsed seconds, never negative", () => {
    expect(elapsedSec(new Date(NOW.getTime() - 90_500), NOW)).toBe(90);
    expect(elapsedSec(new Date(NOW.getTime() + 5000), NOW)).toBe(0);
  });
});
