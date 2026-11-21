import { describe, expect, it } from "vitest";
import { decide, rulesForSubjects, type VisibilityRule } from "./engine";

const KEY = "widget.teacher.atRiskStudents";
const NOW = new Date("2026-11-22T10:00:00Z");
let n = 0;
const rule = (
  subject_type: string,
  effect: "show" | "hide",
  extra: Partial<VisibilityRule> = {},
): VisibilityRule => ({
  id: `r${++n}`,
  target_key: KEY,
  subject_type,
  subject_id: `${subject_type}-1`,
  effect,
  starts_at: null,
  ends_at: null,
  ...extra,
});

describe("visibility precedence", () => {
  it("falls back to the registry default", () => {
    expect(decide([], KEY, true, NOW)).toEqual({ visible: true, reason: "default" });
    expect(decide([], KEY, false, NOW).visible).toBe(false);
  });

  const levels = ["user", "class", "grade", "school", "role", "plan"];
  it.each(levels.slice(0, -1).map((lvl, i) => [lvl, levels[i + 1]]))(
    "%s beats %s",
    (higher, lower) => {
      const d = decide(
        [rule(lower as string, "hide"), rule(higher as string, "show")],
        KEY,
        true,
        NOW,
      );
      expect(d.visible).toBe(true);
      expect(d.rule?.subject_type).toBe(higher);
      const d2 = decide(
        [rule(lower as string, "show"), rule(higher as string, "hide")],
        KEY,
        true,
        NOW,
      );
      expect(d2.visible).toBe(false);
    },
  );

  it("user beats plan across the whole chain", () => {
    expect(decide([rule("plan", "hide"), rule("user", "show")], KEY, false, NOW).visible).toBe(
      true,
    );
  });

  it("hide wins over show at the same level", () => {
    const d = decide(
      [rule("class", "show"), rule("class", "hide", { subject_id: "class-2" })],
      KEY,
      true,
      NOW,
    );
    expect(d).toMatchObject({ visible: false, reason: "rule" });
  });

  it("ignores rules for other keys", () => {
    expect(
      decide([rule("user", "hide", { target_key: "widget.other" })], KEY, true, NOW).visible,
    ).toBe(true);
  });

  it("respects time windows", () => {
    const future = rule("user", "hide", { starts_at: "2026-12-01T00:00:00Z" });
    const past = rule("user", "hide", { ends_at: "2026-11-01T00:00:00Z" });
    const current = rule("class", "hide", {
      starts_at: "2026-11-01T00:00:00Z",
      ends_at: "2026-12-01T00:00:00Z",
    });
    expect(decide([future, past], KEY, true, NOW).visible).toBe(true);
    expect(decide([future, past, current], KEY, true, NOW)).toMatchObject({
      visible: false,
      rule: current,
    });
    expect(
      decide([rule("user", "hide", { ends_at: NOW.toISOString() })], KEY, true, NOW).visible,
    ).toBe(true);
  });
});

describe("rulesForSubjects", () => {
  it("keeps only rules aimed at the given subjects", () => {
    const rules = [
      rule("class", "hide"),
      rule("class", "hide", { subject_id: "class-2" }),
      rule("school", "show"),
    ];
    const picked = rulesForSubjects(rules, [
      { type: "class", id: "class-1" },
      { type: "school", id: "school-1" },
    ]);
    expect(picked.map((r) => r.subject_id)).toEqual(["class-1", "school-1"]);
  });
});
