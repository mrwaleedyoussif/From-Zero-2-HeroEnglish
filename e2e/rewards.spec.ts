import { expect, type Page, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

// Needs a seeded local Supabase with the demo content imported (content.spec.ts first, --workers=1).
// Acceptance (Phase 6): a teacher can disable the leaderboard for a class.
test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Supabase not configured");
test.describe.configure({ mode: "serial" });

async function student(page: Page, username: string) {
  await page.goto("/en/student-login");
  await page.getByLabel("School code").fill("riy01");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("PIN (6 digits)").fill("246810");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/student$/);
}

test("rewards: first badge, class leaderboard, teacher switches it off, kudos", async ({
  browser,
}) => {
  // 1. Lama finishes a lesson: XP, a celebration and the "First Step" badge.
  const lama = await (await browser.newContext()).newPage();
  await student(lama, "lama.f");
  await lama.goto("/en/student/lessons");
  await lama.locator('[data-section="recommended"] [data-lesson="L-GEN-GRAM-005"]').click();
  await lama.getByLabel("Type your answer.").fill("played");
  await lama.getByRole("button", { name: "Check my answers" }).click();
  const party = lama.locator("[data-celebration]");
  await expect(party).toBeVisible();
  await expect(party).toContainText("New badge!");

  await lama.goto("/en/student/rewards");
  await expect(lama.locator('[data-badge="B-FIRST-LESSON"]')).toHaveAttribute("data-earned", "yes");
  await expect(lama.locator('[data-board="class"]')).toContainText("Lama Fahad");

  // 2. The 4A teacher switches the leaderboard off …
  const teacher = await (await browser.newContext()).newPage();
  await signInByEmail(teacher, "teacher@demo.linguapath.test");
  await teacher.goto("/en/teacher/rewards");
  await expect(teacher.locator("[data-leaderboard]")).toHaveAttribute("data-leaderboard", "on");
  await teacher.getByRole("button", { name: "Switch off" }).click();
  await expect(teacher.locator("[data-leaderboard]")).toHaveAttribute("data-leaderboard", "off");

  // … and students of 4A no longer see it (page and home widget).
  await lama.reload();
  await expect(lama.locator("[data-board-off]")).toBeVisible();
  await expect(lama.locator('[data-board="class"]')).toHaveCount(0);
  await lama.goto("/en/student");
  await expect(lama.locator('[data-widget="widget.student.leaderboard"]')).toContainText(
    "switched off",
  );

  // 3. Back on, and a kudos reaches the student's bell.
  await teacher.getByRole("button", { name: "Switch on" }).click();
  await expect(teacher.locator("[data-leaderboard]")).toHaveAttribute("data-leaderboard", "on");
  await teacher.getByRole("button", { name: "Give kudos to Lama Fahad" }).click();
  await expect(teacher.getByText("Kudos sent")).toBeVisible();
  await lama.goto("/en/student/rewards");
  await expect(lama.locator('[data-board="class"]')).toContainText("Lama Fahad");
  await lama.locator("[data-notifications] summary").click();
  await expect(lama.getByText(/Kudos from Demo Teacher/)).toBeVisible();
});
