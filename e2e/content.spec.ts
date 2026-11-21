import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

// Needs the app running with STORAGE_DRIVER=fake and FAKE_DRIVE_DIR (a writable copy of
// supabase/fixtures/drive), plus a seeded local Supabase.
const DRIVE = process.env.FAKE_DRIVE_DIR;
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_DRIVER !== "fake" || !DRIVE,
  "fake Drive not configured",
);
test.describe.configure({ mode: "serial" });

const questions = () => join(DRIVE ?? "", "LinguaPath/01_Content/Questions.csv");

test("acceptance: sample sheets give a clean diff, a broken row is explained, media plays", async ({
  page,
  browser,
}) => {
  await signInByEmail(page, "owner@demo.linguapath.test");

  // 1. A broken row: difficulty 11 in row 2 of Questions.
  const original = readFileSync(questions(), "utf8");
  writeFileSync(questions(), original.replace(",C,3,A2,", ",C,11,A2,"));
  try {
    await page.goto("/en/owner/content");
    await page.getByRole("button", { name: "Check sheets" }).click();
    const issue = page.locator('[data-issue="range"]');
    await expect(issue).toContainText("Questions, row 2");
    await expect(issue).toContainText("difficulty");
    await expect(issue).toContainText("Must be between 1 and 10.");
  } finally {
    writeFileSync(questions(), original);
  }

  // 2. The samples as written: clean diff (no errors), everything new; apply.
  await page.getByRole("button", { name: "Check sheets" }).click();
  await expect(page.locator("[data-issue]")).toHaveCount(0);
  await expect(page.locator('[data-sheet="Questions"] td').nth(1)).toHaveText("6");
  await expect(page.locator('[data-sheet="Lessons"] td').nth(1)).toHaveText("4");
  await page.getByRole("button", { name: /^Apply \d+ changes$/ }).click();
  await expect(page.getByText(/Done: \d+ rows saved/)).toBeVisible();
  await expect(page.locator('[data-count="lessons"]')).toHaveText("4");

  // 3. Syncing again finds nothing to change.
  await page.getByRole("button", { name: "Check sheets" }).click();
  await expect(page.getByText("Everything is up to date.")).toBeVisible();

  // 4. A teacher finds the listening lesson in the library and its audio plays through the proxy.
  const teacher = await (await browser.newContext()).newPage();
  await signInByEmail(teacher, "teacher@demo.linguapath.test");
  await teacher.goto("/en/teacher/library?format=audio");
  const card = teacher.locator('[data-lesson="L-GEN-LIST-001"]');
  await expect(card).toBeVisible();
  const href = await card.getByRole("link", { name: "Open lesson material" }).getAttribute("href");
  expect(href).toMatch(/^\/api\/media\/[0-9a-f-]{36}$/);

  const full = await teacher.request.get(href ?? "");
  expect(full.status()).toBe(200);
  expect(full.headers()["content-type"]).toBe("audio/mpeg");
  expect(full.headers()["cache-control"]).toContain("immutable");
  const part = await teacher.request.get(href ?? "", { headers: { Range: "bytes=0-99" } });
  expect(part.status()).toBe(206);
  expect(part.headers()["content-range"]).toMatch(/^bytes 0-99\//);
  await teacher.goto("/en/teacher/library"); // same origin for the media request
  const duration = await teacher.evaluate(async (src) => {
    const audio = new Audio(src);
    await new Promise((ok, fail) => {
      audio.onloadedmetadata = ok;
      audio.onerror = () => fail(new Error("media error"));
    });
    return audio.duration;
  }, href ?? "");
  expect(duration).toBeGreaterThan(1.5);

  // 5. Signed-out requests get nothing.
  const anon = await (await browser.newContext()).request.get(`http://localhost:3000${href}`);
  expect(anon.status()).toBe(401);
});
