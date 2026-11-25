import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ serverEnv: () => ({ MAIL_PROVIDER: "resend" }) }));
vi.mock("@/lib/mail", () => ({ getMailer: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const { authEmail, ownAuthMail } = await import("./auth-mail");

describe("staff sign-in emails", () => {
  const link = "https://x.supabase.co/auth/v1/verify?token=abc&type=invite&redirect_to=https://app";

  it("writes the invitation in both languages, the reader's first, with the link", () => {
    const m = authEmail("invite", "t@school.sa", link, "ar", "Mona <Ali>");
    expect(m.to).toBe("t@school.sa");
    expect(m.subject).toBe("دعوة إلى Zero-2-Hero English");
    expect(m.html.indexOf("دعوة")).toBeLessThan(m.html.indexOf("You are invited"));
    expect(m.html).toContain(
      'href="https://x.supabase.co/auth/v1/verify?token=abc&amp;type=invite',
    );
    expect(m.html).toContain("Mona &lt;Ali&gt;,");
    expect(m.text).toContain(link);
  });

  it("writes the sign-in link email", () => {
    const m = authEmail("magiclink", "t@school.sa", link, "en");
    expect(m.subject).toBe("Your sign-in link for Zero-2-Hero English");
    expect(m.html).not.toContain("undefined");
  });

  it("is used whenever a real mail service is configured", () => {
    expect(ownAuthMail()).toBe(true);
  });
});
