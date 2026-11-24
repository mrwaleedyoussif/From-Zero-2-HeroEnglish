import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

// Needs the app running with STORAGE_DRIVER=fake and FAKE_DRIVE_DIR, plus a seeded local Supabase.
const DRIVE = process.env.FAKE_DRIVE_DIR;
test.skip(process.env.STORAGE_DRIVER !== "fake" || !DRIVE, "fake Drive not configured");

const bi = (en: string) => ({ en, ar: "نص عربي" });
const unit = {
  id: "RW-A1P-U01",
  strand: "RW",
  level: "A1P",
  unit: 1,
  title: "A new phone",
  title_ar: "هاتف جديد",
  objectives: [bi("Read a short text about a phone.")],
  vocabulary: [
    {
      id: "V1",
      word: "camera",
      pos: "noun",
      ipa: "/ˈkæm.rə/",
      definition: "It takes photos.",
      arabic: "كاميرا",
    },
  ],
  hook: { question: bi("Do you have a phone?"), prediction: bi("Guess what Reem buys.") },
  passage: {
    id: "T1",
    title: "Reem's phone",
    paragraphs: ["Reem has a new phone. It has a good camera."],
  },
  comprehension: [
    {
      id: "Q1",
      type: "mcq",
      skill: "detail",
      stem: "What does Reem have?",
      options: { a: "a bike", b: "a phone", c: "a cat", d: "a pen" },
      answer: "b",
      hints: [bi("Read the first sentence again."), bi("It has a camera."), bi("It is a phone.")],
      explanation: bi("The first sentence says Reem has a new phone."),
    },
    {
      id: "Q2",
      type: "tfng",
      skill: "detail",
      stem: "The camera is good.",
      answer: "True",
      explanation: bi("It says so."),
    },
  ],
  writing_task: {
    prompt: bi("Write about your phone."),
    word_count: [3, 40],
    model_answer_4: "I have a phone. It is black.",
  },
};

test("owner imports unit files from Drive; a unit teaches with hints and keeps the answer on the server", async ({
  page,
}) => {
  const folder = join(DRIVE ?? "", "LinguaPath/01_Content/Units/RW/A1P");
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "unit_01.json"), JSON.stringify(unit));
  writeFileSync(
    join(folder, "unit_02.json"),
    JSON.stringify({ ...unit, id: "RW-A1P-U02", unit: 2, level: "Z9" }),
  );
  try {
    await signInByEmail(page, "owner@demo.linguapath.test");
    await page.goto("/en/owner/content");
    await page.getByRole("button", { name: "Import units from Drive" }).click();
    await expect(page.locator("[data-units-imported='1']")).toContainText("1 saved");
    await expect(page.locator("[data-unit-issue]")).toContainText("unit_02.json");
    // A second import changes nothing.
    await page.getByRole("button", { name: "Import units from Drive" }).click();
    await expect(page.locator("[data-units-imported='0']")).toContainText("1 unchanged");

    await page.goto("/en/student/units/RW");
    await expect(page.locator("[data-level='A1+']")).toBeVisible();
    await page.locator("[data-unit='RW-A1P-U01']").click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("A new phone");
    // The page never carries the key or the explanation before the learner answers.
    expect(await page.content()).not.toContain("The first sentence says");

    const q1 = page.locator("[data-question='Q1']");
    await q1.getByRole("button", { name: /a bike/ }).click();
    await expect(q1).toContainText("Read the first sentence again.");
    await q1.getByRole("button", { name: /a phone/ }).click();
    await expect(q1).toContainText("Well done!");
    await expect(q1).toContainText("The first sentence says Reem has a new phone.");

    await page.getByLabel("Write here").fill("I have a phone.");
    await expect(page.locator("[data-words='4']")).toBeVisible();
    await page.getByRole("button", { name: "Save my writing" }).click();
    await expect(page.getByText("It is black.")).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual(
      [],
    );
  } finally {
    rmSync(join(DRIVE ?? "", "LinguaPath/01_Content/Units"), { recursive: true, force: true });
  }
});
