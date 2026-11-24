import { expect, type Page, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

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

const signInAsOwner = async (page: Page) => {
  await signInByEmail(page, "owner@demo.linguapath.test");
  await page.goto("/en/owner/learners");
};
/** Email → code → the welcome form, ready to be filled in. */
async function reachWelcome(page: Page, email: string) {
  await page.goto("/en/learner");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText(`We sent a code to ${email}`)).toBeVisible();
  await page.getByLabel("Code from the email").fill(await freshCode(email));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/en\/learner\/welcome$/);
  await page.getByLabel("Your name").fill("Layla Learner");
  await page.getByLabel(/I agree that/).check();
}
const tryCode = async (page: Page, email: string) => {
  await page.goto("/en/learner");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  // Wait for the app's own code first: the fresh one below must be the newest.
  await expect(page.getByText(`We sent a code to ${email}`)).toBeVisible();
  await page.getByLabel("Code from the email").fill(await freshCode(email));
  await page.getByRole("button", { name: "Continue" }).click();
};

test("without a code a learner waits until the Owner approves", async ({ page, browser }) => {
  const email = `wait.${Date.now()}@example.test`;
  await reachWelcome(page, email);
  await page.getByRole("button", { name: "Start learning" }).click();
  await expect(page).toHaveURL(/\/en\/learner\/pending$/);
  // Still waiting: a correct code does not let them in, and no portal opens.
  await tryCode(page, email);
  await expect(page.getByText("still waiting for approval")).toBeVisible();
  await page.goto("/en/student");
  await expect(page).not.toHaveURL(/\/en\/student$/);

  const owner = await (await browser.newContext()).newPage();
  await signInAsOwner(owner);
  const row = owner.locator(`[data-request="${email}"]`);
  await expect(row).toContainText("Layla Learner");
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(row).toHaveCount(0);

  await tryCode(page, email);
  await expect(page).toHaveURL(/\/en\/student$/);
  await expect(page.getByText("Signed in as Layla Learner")).toBeVisible();
  await page.goto("/en/owner/users");
  await expect(page).toHaveURL(/\/en\/student$/); // a learner never reaches staff pages
});

test("an invitation code lets a learner in at once, until its places run out", async ({
  page,
  browser,
}) => {
  const owner = await (await browser.newContext()).newPage();
  await signInAsOwner(owner);
  const label = `Evening course ${Date.now()}`;
  await owner.getByLabel("What it is for").fill(label);
  await owner.getByLabel("How many people").fill("1");
  await owner.getByRole("button", { name: "Create a code" }).click();
  const invite = owner.locator(`[data-invite="${label}"]`);
  const code = (await invite.locator(".font-mono").innerText()).trim();
  expect(code).toMatch(/^[A-Z0-9]{8}$/);

  await reachWelcome(page, `code.${Date.now()}@example.test`);
  await page.getByLabel("Invitation code (optional)").fill("WRONG999");
  await page.getByRole("button", { name: "Start learning" }).click();
  await expect(page.getByText("That invitation code is not valid")).toBeVisible();
  await page.getByLabel("Your name").fill("Layla Learner");
  await page.getByLabel(/I agree that/).check();
  await page.getByLabel("Invitation code (optional)").fill(code.toLowerCase());
  await page.getByRole("button", { name: "Start learning" }).click();
  await expect(page).toHaveURL(/\/en\/student$/);

  // The one place is taken: the next person with the same code is refused.
  await owner.reload();
  await expect(invite).toContainText("Used: 1/1");
  await expect(invite).toContainText("Used up");
  const second = await (await browser.newContext()).newPage();
  await reachWelcome(second, `late.${Date.now()}@example.test`);
  await second.getByLabel("Invitation code (optional)").fill(code);
  await second.getByRole("button", { name: "Start learning" }).click();
  await expect(second.getByText("That invitation code is not valid")).toBeVisible();
});
