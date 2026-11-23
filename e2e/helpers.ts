import { expect, type Page } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

interface MailpitMessage {
  ID: string;
  Created: string;
}

/** The newest Supabase Auth link emailed to this address (local Mailpit inbox). */
export async function mailLink(email: string, since: number): Promise<string> {
  let link: string | undefined;
  for (let i = 0; i < 40 && !link; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const res = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
    );
    const { messages = [] } = (await res.json()) as { messages?: MailpitMessage[] };
    const fresh = messages.find((m) => new Date(m.Created).getTime() >= since);
    if (fresh) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${fresh.ID}`)).json()) as {
        HTML: string;
        Text: string;
      };
      link = `${full.HTML}${full.Text}`.match(
        /https?:\/\/[^"\s<)]+\/auth\/v1\/verify[^"\s<)]+/,
      )?.[0];
    }
  }
  if (!link) throw new Error(`No sign-in email for ${email}`);
  return link.replace(/&amp;/g, "&");
}

/** Staff sign-in via magic link, read from the local Mailpit inbox (local Supabase only). */
export async function signInByEmail(page: Page, email: string): Promise<void> {
  const since = Date.now() - 1000;
  await page.goto("/en/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();

  const link = await mailLink(email, since);
  await page.goto(link);
  await expect(page).not.toHaveURL(/\/login/);
}
