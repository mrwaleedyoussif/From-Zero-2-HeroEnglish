import { describe, expect, it } from "vitest";
import { approvedEmail, codeEmail } from "./code-email";
import { inviteState } from "./invite-state";

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

  it("tells an approved learner where to sign in, in both languages", () => {
    const m = approvedEmail("a@b.test", "https://x.test/ar/learner", "ar");
    expect(m.subject).toContain("تمت الموافقة");
    expect(m.html).toContain('href="https://x.test/ar/learner"');
    expect(m.text).toContain("You're in!");
  });
});

describe("invitation codes", () => {
  it("are active until cancelled, past their last day, or used up", () => {
    const now = new Date("2026-12-01T10:00:00Z");
    const base = { status: "active", expires_at: null, used: 0, max_uses: 2 };
    expect(inviteState(base, now)).toBe("active");
    expect(inviteState({ ...base, status: "cancelled" }, now)).toBe("cancelled");
    expect(inviteState({ ...base, expires_at: "2026-11-30T23:59:59Z" }, now)).toBe("expired");
    expect(inviteState({ ...base, expires_at: "2026-12-01T23:59:59Z" }, now)).toBe("active");
    expect(inviteState({ ...base, used: 2 }, now)).toBe("full");
  });
});
