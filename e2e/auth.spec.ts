import { expect, test } from "@playwright/test";
import { mailLink, signInByEmail } from "./helpers";

// Needs a running, seeded Supabase (npm run db:start && npm run db:reset) and its env vars.
test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Supabase not configured");

test("student signs in with school code, username and PIN", async ({ page }) => {
  await page.goto("/en/student-login");
  await page.getByLabel("School code").fill("riy01");
  await page.getByLabel("Username").fill("omar.s");
  await page.getByLabel("PIN (6 digits)").fill("111111");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("not right")).toBeVisible();
  // A failed attempt keeps what was typed, except the PIN.
  await expect(page.getByLabel("Username")).toHaveValue("omar.s");
  await expect(page.getByLabel("PIN (6 digits)")).toHaveValue("");

  await page.getByLabel("PIN (6 digits)").fill("246810");
  await page.getByRole("button", { name: "Sign in" }).click();
  // Lands on the student gate (highest-priority gate the student may enter).
  await expect(page).toHaveURL(/\/en\/student$/);
  await expect(page.getByText("Signed in as Omar Saleh")).toBeVisible();

  // Students cannot enter the owner gate: they are sent back to their own gate.
  await page.goto("/en/owner/users");
  await expect(page).toHaveURL(/\/en\/student$/);
});

test("signed-out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/en/owner/roles");
  await expect(page).toHaveURL(/\/en\/login$/);
});

test("an invited member of staff signs in from the invitation email", async ({ browser }) => {
  const owner = await (await browser.newContext()).newPage();
  await signInByEmail(owner, "owner@demo.linguapath.test");
  await owner.goto("/en/owner/users");
  const email = `invited.${Date.now()}@demo.linguapath.test`;
  const since = Date.now() - 1000;
  await owner.locator("#invite-full_name").fill("Invited Principal");
  await owner.locator("#invite-email").fill(email);
  await owner.locator("#invite-role_id").selectOption({ label: "Principal" });
  await owner.getByRole("button", { name: "Send invite" }).click();
  await expect(owner.getByText("Invitation sent")).toBeVisible();

  // The invitation link carries its tokens in the URL fragment (no PKCE code).
  const invited = await (await browser.newContext()).newPage();
  await invited.goto(await mailLink(email, since));
  await expect(invited).toHaveURL(/\/en\/leadership$/);
  await expect(invited.getByText("Signed in as Invited Principal")).toBeVisible();
});
