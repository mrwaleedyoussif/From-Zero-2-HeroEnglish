import { describe, expect, it } from "vitest";
import { courseLevel, openUnits, type Step } from "./order";

const s = (id: string, level: Step["level"], done = false): Step => ({ id, level, unit: 1, done });

describe("which units a learner may open", () => {
  const course = [
    s("a1-1", "A1"),
    s("a1-2", "A1"),
    s("a2-1", "A2"),
    s("a2-2", "A2"),
    s("b1-1", "B1"),
  ];
  it("opens lower levels, the first unit of the learner's level, and closes the rest", () => {
    expect([...openUnits(course, "A2")]).toEqual(["a1-1", "a1-2", "a2-1"]);
  });
  it("opens the next unit once the one before it is finished, across levels too", () => {
    const steps = course.map((x) =>
      x.id === "a2-1" || x.id === "a2-2" ? { ...x, done: true } : x,
    );
    expect([...openUnits(steps, "A2")]).toEqual(["a1-1", "a1-2", "a2-1", "a2-2", "b1-1"]);
  });
  it("starts at the beginning with no level, and keeps finished units open", () => {
    expect([...openUnits(course, null)]).toEqual(["a1-1"]);
    const reviewed = course.map((x) => (x.id === "b1-1" ? { ...x, done: true } : x));
    expect(openUnits(reviewed, null).has("b1-1")).toBe(true);
  });
  it("opens everything below when the course has nothing at or above the level", () => {
    expect(openUnits(course, "C2").size).toBe(5);
  });
  it("reads placement results", () => {
    expect(courseLevel("B1")).toBe("B1");
    expect(courseLevel("Z9")).toBeNull();
    expect(courseLevel(null)).toBeNull();
  });
});
