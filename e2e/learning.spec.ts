import { expect, type Page, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

// Needs a seeded local Supabase with the demo content imported (run after content.spec.ts with
// --workers=1). Acceptance (Phase 5): a teacher assigns a lesson to a group; its students see it;
// completion updates the teacher's tracker (on refresh).
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

test("acceptance: assign to a group → students see it → completion updates the tracker", async ({
  browser,
}) => {
  test.setTimeout(90_000); // three people, six steps
  const teacher = await (await browser.newContext()).newPage();
  await signInByEmail(teacher, "teacher@demo.linguapath.test");

  // 1. A flexible group in 4A with two students.
  await teacher.goto("/en/teacher/groups");
  await teacher.getByLabel("Name").fill("Readers");
  await teacher.getByRole("button", { name: "Create" }).click();
  const group = teacher.locator('[data-set="Readers"]');
  await expect(group).toBeVisible();
  for (const name of ["Omar Saleh", "Sara Khalid"]) {
    await group.getByLabel("Add a student").selectOption({ label: name });
    await group.getByRole("button", { name: "Add" }).click();
    await expect(group).toContainText(name);
  }

  // 2. Assign a lesson to the group, due in a week.
  await teacher.goto("/en/teacher/assignments");
  await teacher.locator('[data-lesson="L-GEN-GRAM-005"] input').check();
  await teacher.getByLabel("Group: Readers").check();
  const due = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  await teacher.getByLabel("Due date").fill(due);
  await teacher.getByLabel("Note for students").fill("Read and practise, please");
  await teacher.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(teacher.getByText("Assigned")).toBeVisible();
  const row = teacher.locator('[data-assignment="L-GEN-GRAM-005"]');
  await expect(row.locator('[data-count="not_started"]')).toContainText("2");

  // 3. Omar: onboarding wizard, then the lesson is in "From my teacher" with a notification.
  const omar = await (await browser.newContext()).newPage();
  await student(omar, "omar.s");
  await omar.goto("/en/student/profile");
  await omar.getByText("Sports").click();
  for (let i = 0; i < 4; i++) await omar.getByRole("button", { name: "Next", exact: true }).click();
  await omar.getByRole("button", { name: "Finish" }).click();
  await expect(omar).toHaveURL(/\/en\/student\/lessons$/);
  await expect(omar.locator("[data-notifications]")).toHaveAttribute("data-notifications", "1");
  const tile = omar.locator('[data-section="from-teacher"] [data-lesson="L-GEN-GRAM-005"]');
  await expect(tile).toContainText("Read and practise, please");
  await tile.click();

  // 4. Omar does the practice check and finishes the lesson.
  await omar.getByLabel("Type your answer.").fill("played");
  await omar.getByRole("button", { name: "Check my answers" }).click();
  await expect(omar.locator("[data-done]")).toContainText("Lesson finished!");
  await expect(omar.getByText("Your score: 100%")).toBeVisible();

  // 5. A 4A student outside the group doesn't get it.
  const lama = await (await browser.newContext()).newPage();
  await student(lama, "lama.f");
  await lama.goto("/en/student/lessons");
  await expect(lama.locator('[data-section="from-teacher"] [data-lesson]')).toHaveCount(0);

  // 6. The teacher's tracker shows Omar done, Sara not started.
  await teacher.reload();
  await expect(row.locator('[data-count="done"]')).toContainText("1");
  await expect(row.locator('[data-count="not_started"]')).toContainText("1");
  await row.locator("summary").click();
  await expect(row.locator('[data-student-status="done"]')).toContainText("Omar Saleh");
});
