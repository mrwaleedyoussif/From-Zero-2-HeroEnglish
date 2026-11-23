import { describe, expect, it } from "vitest";
import { codeEmail } from "./code-email";

describe("one-time code email", () => {
  it("carries the code in the subject, the text and the page, in both languages", () => {
    const m = codeEmail("a@b.test", "482913", "ar");
    expect(m.to).toBe("a@b.test");
    expect(m.subject.startsWith("482913")).toBe(true);
    expect(m.text).toContain("482913");
    expect(m.html).toContain(">482913<");
    // Arabic first for an Arabic reader, English after it.
    expect(m.html.indexOf('dir="rtl"')).toBeLessThan(m.html.lastIndexOf('dir="ltr" style="margin'));
    expect(m.text).toContain("Your sign-in code");
    expect(codeEmail("a@b.test", "1", "en").subject).toContain("Your sign-in code");
  });
});
