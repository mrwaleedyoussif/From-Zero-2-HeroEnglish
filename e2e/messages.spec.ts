import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

const DB = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q: string) => execFileSync("psql", [DB, "-qtAc", q]).toString().trim();

async function studentSignIn(page: import("@playwright/test").Page) {
  await page.goto("/en/student-login");
  await page.getByLabel("School code").fill("riy01");
  await page.getByLabel("Username").fill("omar.s");
  await page.getByLabel("PIN (6 digits)").fill("246810");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/student$/, { timeout: 15_000 });
}

test("a teacher writes to a class inside the app; the student reads it and cannot write; both show as online", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const since = sql("select now()");
  try {
    const teacher = await (await browser.newContext()).newPage();
    await signInByEmail(teacher, "teacher@demo.linguapath.test");
    // The menu is a button on the right edge; it opens, and closes after a choice.
    await teacher.goto("/en/teacher");
    const menu = teacher.locator("[data-menu-button]");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(teacher.getByRole("link", { name: "Messages", exact: true })).toBeHidden();
    await menu.click();
    await teacher.getByRole("link", { name: "Messages", exact: true }).click();
    await expect(teacher).toHaveURL(/\/en\/teacher\/messages/);
    await expect(teacher.locator("#side-menu")).toHaveAttribute("data-open", "false");

    await teacher
      .getByRole("navigation", { name: "Choose a class" })
      .getByRole("link")
      .first()
      .click();
    await teacher.getByRole("checkbox", { name: /The whole class/ }).check();
    await teacher.getByLabel("Your message").fill("Bring your reading book tomorrow.");
    await teacher.locator("[data-send]").click();
    await expect(teacher.getByText("Message sent")).toBeVisible();
    await expect(teacher.locator("[data-messages='sent'] li").first()).toContainText(
      "Bring your reading book tomorrow.",
    );

    const student = await (await browser.newContext()).newPage();
    await studentSignIn(student);
    await student.goto("/en/student/messages");
    const got = student.locator("[data-messages='inbox'] li").first();
    await expect(got).toContainText("Bring your reading book tomorrow.");
    await expect(got).toHaveAttribute("data-unread", "true");
    // A student has nothing to write with.
    await expect(student.locator("[data-send]")).toHaveCount(0);
    await student.reload();
    await expect(student.locator("[data-messages='inbox'] li").first()).not.toHaveAttribute(
      "data-unread",
      "true",
    );

    // The teacher sees the read count and the student online.
    await teacher.reload();
    await expect(teacher.locator("[data-messages='sent'] li [data-read]").first()).toHaveAttribute(
      "data-read",
      "1",
    );
    await teacher.goto("/en/teacher/online");
    await expect(teacher.locator("[data-online='true']", { hasText: "Omar" })).toBeVisible();
  } finally {
    sql(`delete from messages where created_at >= '${since}'`);
    sql(`delete from notifications where created_at >= '${since}'`);
    sql("delete from presence");
  }
});
