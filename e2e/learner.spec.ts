import { expect, test } from "@playwright/test";

// General learners: needs the local Supabase and GENERAL_LEARNERS_ENABLED=true.
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.GENERAL_LEARNERS_ENABLED !== "true",
  "general learners not enabled",
);

/**
 * The app emails the code through its mail adapter, which only logs in tests. Ask Supabase Auth
 * for a fresh code for the same address instead (it replaces the emailed one): everything but
 * the email's delivery is still exercised.
 */
async function freshCode(email: string): Promise<string> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", email }),
  });
  const { email_otp } = (await res.json()) as { email_otp?: string };
  if (!email_otp) throw new Error(`No code for ${email}`);
  return email_otp;
}

test("a general learner joins with an emailed code, then signs in again the same way", async ({
  page,
  browser,
}) => {
  const email = `learner.${Date.now()}@example.test`;
  const enter = async (p: typeof page) => {
    await p.goto("/en/learner");
    await p.getByLabel("Email").fill(email);
    await p.getByRole("button", { name: "Email me a code" }).click();
    await expect(p.getByText(`We sent a code to ${email}`)).toBeVisible();
    return freshCode(email);
  };

  // A wrong code is refused; the right one moves on.
  const code = await enter(page);
  await page.getByLabel("Code from the email").fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("That code is not right")).toBeVisible();
  await page.getByLabel("Code from the email").fill(code);
  await page.getByRole("button", { name: "Continue" }).click();

  // First visit: name, adult, terms. Then the student area.
  await expect(page).toHaveURL(/\/en\/learner\/welcome$/);
  await page.getByLabel("Your name").fill("Layla Learner");
  await page.getByLabel("I am 18 or older.").check();
  await page.getByLabel(/I agree that/).check();
  await page.getByRole("button", { name: "Start learning" }).click();
  await expect(page).toHaveURL(/\/en\/student$/);
  await expect(page.getByText("Signed in as Layla Learner")).toBeVisible();
  // A learner outside a school cannot reach staff portals.
  await page.goto("/en/owner/users");
  await expect(page).toHaveURL(/\/en\/student$/);

  // Coming back on another device: the code alone signs them in.
  const again = await (await browser.newContext()).newPage();
  const second = await enter(again);
  await again.getByLabel("Code from the email").fill(second);
  await again.getByRole("button", { name: "Continue" }).click();
  await expect(again).toHaveURL(/\/en\/student$/);
});
