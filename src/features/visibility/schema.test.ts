import { describe, expect, it } from "vitest";
import { ruleSchema, subjectSchema } from "./schema";

const ID = "8b2d1c3e-7f6a-4e5b-9c8d-1a2b3c4d5e6f";

describe("visibility form schemas", () => {
  it("parses subjects", () => {
    expect(subjectSchema.parse(`class:${ID}`)).toEqual({ type: "class", id: ID });
    expect(subjectSchema.parse("user:")).toEqual({ type: "user", id: null });
    expect(subjectSchema.safeParse("class:").success).toBe(false);
    expect(subjectSchema.safeParse(`team:${ID}`).success).toBe(false);
  });

  it("parses a rule with an optional window", () => {
    const r = ruleSchema.parse({
      target_key: "widget.teacher.atRiskStudents",
      subject: `class:${ID}`,
      effect: "hide",
      starts_at: "2026-11-22T08:00",
      ends_at: "",
    });
    expect(r.starts_at).toMatch(/^2026-11-22T/);
    expect(r.ends_at).toBeNull();
  });

  it("rejects a window that ends before it starts", () => {
    const r = ruleSchema.safeParse({
      target_key: "module.rewards",
      subject: `school:${ID}`,
      effect: "hide",
      starts_at: "2026-12-01T00:00",
      ends_at: "2026-11-01T00:00",
    });
    expect(r.success).toBe(false);
  });
});
