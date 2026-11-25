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
  // The eye button shows the PIN so the learner can check it, and hides it again.
  const pin = page.getByLabel("PIN (6 digits)");
  await expect(pin).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show what I typed" }).click();
  await expect(pin).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide what I typed" }).click();
  await expect(pin).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Sign in" }).click();
  // Lands on the student gate (highest-priority gate the student may enter).
  await expect(page).toHaveURL(/\/en\/student$/);
  await expect(page.getByText("Signed in as Omar Saleh")).toBeVisible();

  // Students cannot enter the owner gate: they are sent back to their own gate.
  await page.goto("/en/owner/users");
  await expect(page).toHaveURL(/\/en\/student$/);
});

test("an Arabic reader gets the portal in Arabic after signing in", async ({ page }) => {
  await page.goto("/ar/student-login");
  await page.locator("#schoolCode").fill("riy01");
  await page.locator("#username").fill("omar.s");
  await page.locator('input[name="pin"]').fill("246810");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/ar\/student$/);
  // Pages after sign-in once fell back to English: the page's language was not passed on.
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("تعلّمي");
  await expect(page.getByRole("link", { name: "دروسي" })).toBeVisible();
  // No sideways scrolling on a phone.
  await page.setViewportSize({ width: 390, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
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

test("staff can set a password and then sign in with it, without an email", async ({ page }) => {
  await signInByEmail(page, "principal@demo.linguapath.test");
  await page.goto("/en/account");
  await page.getByLabel("New password").fill("short");
  await page.getByLabel("Type it again").fill("short");
  await page.locator("#new-password").evaluate((el) => el.removeAttribute("minlength"));
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.locator("main form").getByRole("alert")).toContainText(
    "at least 10 characters",
  );
  await page.getByLabel("New password").fill("a-long-school-password");
  await page.getByLabel("Type it again").fill("a-long-school-password");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.locator("main form").getByRole("status")).toContainText("Password saved");

  await page.context().clearCookies();
  await page.goto("/en/login");
  await page.getByText("Sign in with a password instead").click();
  const form = page.locator("[data-password-signin]");
  await form.getByLabel("Your email").fill("principal@demo.linguapath.test");
  await form.getByLabel("Password").fill("not-the-password");
  await form.getByRole("button", { name: "Sign in" }).click();
  await expect(form.getByRole("alert")).toContainText("don't match");
  await form.getByLabel("Password").fill("a-long-school-password");
  await form.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/leadership$/);
});
