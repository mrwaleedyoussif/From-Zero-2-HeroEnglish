import { expect, type Page, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

// Needs a seeded local Supabase and the demo content imported (content.spec.ts runs first
// with --workers=1, or import the sample sheets in Owner → Content).
test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Supabase not configured");
test.describe.configure({ mode: "serial" });

async function studentSignIn(page: Page) {
  await page.goto("/en/student-login");
  await page.getByLabel("School code").fill("riy01");
  await page.getByLabel("Username").fill("omar.s");
  await page.getByLabel("PIN (6 digits)").fill("246810");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/student$/);
}

/** Answer whatever item is on screen (right or wrong doesn't matter here). */
async function answerCurrent(page: Page) {
  const choice = page.getByRole("radio").or(page.getByRole("checkbox")).first();
  if (await choice.isVisible()) await choice.check();
  else await page.getByLabel("Type your answer.").fill("went");
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

test("student takes the GEN placement, resumes after reload, sees result; teacher scores writing", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000); // a long journey: a whole test, then the teacher's scoring
  await studentSignIn(page);
  await expect(page.locator('[data-widget="widget.student.placementCta"]')).toBeVisible();
  await page.goto("/en/student/placement");
  const gen = page.locator('[data-department="GEN"]');
  await gen.getByRole("button", { name: "Start the test" }).click();
  await expect(page).toHaveURL(/\/en\/student\/placement\/[0-9a-f-]{36}$/);
  const testUrl = page.url();

  // First answer, then a reload resumes at the same (second) question — no going back.
  await expect(page.getByText(/^Question 1 /)).toBeVisible();
  await answerCurrent(page);
  await expect(page.getByText(/^Question 2 /)).toBeVisible();
  const stem = await page.locator("h2").first().textContent();
  await page.reload();
  await expect(page.getByText(/^Question 2 /)).toBeVisible();
  await expect(page.locator("h2").first()).toHaveText(stem ?? "");

  // Answer until the adaptive part ends (the demo bank has only a few receptive items).
  for (let n = 2; n < 30; n++) {
    await answerCurrent(page);
    const next = page.getByText(new RegExp(`^Question ${n + 1} `));
    await expect(next.or(page.getByText("Almost done!"))).toBeVisible();
    if (!(await next.isVisible())) break;
  }
  await expect(page.getByText("Almost done!")).toBeVisible();
  await page
    .getByLabel("Your answer")
    .fill("I played football. I visited my grandma. I read a book.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page).toHaveURL(/\/result$/, { timeout: 20_000 }); // scoring takes a moment
  await expect(page.locator("[data-result]")).toContainText("Your level");
  await expect(page.getByText(/Zero-2-Hero English Scale: \d+/)).toBeVisible();
  await expect(page.getByText("Your teacher will score your writing")).toBeVisible();

  // The test page now only redirects to the result.
  await page.goto(testUrl);
  await expect(page).toHaveURL(/\/result$/);

  // The teacher finds it in the scoring queue and scores it with the rubric.
  const teacher = await (await browser.newContext()).newPage();
  await signInByEmail(teacher, "teacher@demo.linguapath.test");
  await teacher.goto("/en/teacher/placement");
  await teacher.getByRole("link", { name: /Omar Saleh · Writing/ }).click();
  const card = teacher.locator('[data-submission="writing"]');
  await expect(card).toContainText("I played football.");
  for (const label of [
    "Task achievement",
    "Vocabulary range",
    "Grammar accuracy",
    "Fluency & organisation",
    "Overall level",
  ])
    await card.getByLabel(label).selectOption("A2");
  await card.getByLabel("Comment for the student").fill("Good sentences!");
  await card.getByRole("button", { name: "Save score" }).click();
  await expect(card).toContainText("Scored: A2");

  // Back to the student: the result no longer waits for the teacher.
  await page.reload();
  await expect(page.getByText("Your teacher will score your writing")).toHaveCount(0);
});
