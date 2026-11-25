import { mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
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
      id: "RW-A1P-U01-VOC01",
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
    {
      id: "Q3",
      type: "sequence",
      skill: "sequence",
      stem: "Put the events in order.",
      events: ["Reem takes a photo.", "Reem buys a phone."],
      answer: "b, a",
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
  // A recording named after the word it belongs to, and an index file that is not a unit.
  const recording = join(DRIVE ?? "", "LinguaPath/02_Media/audio/RW-A1P-U01-VOC01.mp3");
  writeFileSync(recording, "ID3");
  writeFileSync(join(folder, "..", "manifest.json"), "{}");
  writeFileSync(
    join(folder, "unit_02.json"),
    JSON.stringify({ ...unit, id: "RW-A1P-U02", unit: 2, level: "Z9" }),
  );
  writeFileSync(
    join(folder, "unit_03.json"),
    JSON.stringify({ ...unit, id: "RW-A1P-U03", unit: 3, title: "A new bag" }),
  );
  try {
    await signInByEmail(page, "owner@demo.linguapath.test");
    await page.goto("/en/owner/content");
    await page.getByRole("button", { name: "Import units from Drive" }).click();
    await expect(page.locator("[data-units-imported='2']")).toContainText("2 saved");
    await expect(page.locator("[data-unit-issue]")).toHaveCount(1);
    await expect(page.locator("[data-unit-issue]")).toContainText("unit_02.json");
    await expect(page.locator("[data-units-audio]")).not.toHaveAttribute("data-units-audio", "0");
    // A second import changes nothing.
    await page.getByRole("button", { name: "Import units from Drive" }).click();
    await expect(page.locator("[data-units-imported='0']")).toContainText("2 unchanged");

    await page.goto("/en/student/units/RW");
    await expect(page.locator("[data-level='A1+']")).toBeVisible();
    await page.locator("[data-unit='RW-A1P-U01']").click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("A new phone");
    // The word plays its recording; the paragraph has none and uses the device voice.
    await expect(page.locator("[data-part='words'] [data-recorded]")).toHaveCount(1);
    await expect(page.locator("[data-part='passage'] [data-recorded]")).toHaveCount(0);
    // The page never carries the key or the explanation before the learner answers.
    expect(await page.content()).not.toContain("The first sentence says");

    // Words can be repeated after the speaker.
    await expect(page.locator("[data-word] [data-speech]")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Listen to the whole text" })).toBeVisible();

    // Nothing is checked until the whole exercise is answered and submitted.
    const q1 = page.locator("[data-question='Q1']");
    const submit = page.getByRole("button", { name: "Submit my answers" });
    await expect(submit).toBeDisabled();
    await q1.getByRole("button", { name: /a bike/ }).click();
    await expect(q1).not.toContainText("Read the first sentence again.");
    await page.locator("[data-question='Q2']").getByRole("button", { name: "True" }).click();
    await expect(submit).toBeDisabled();
    // Ordering: click the sentences; the first click is number 1.
    const q3 = page.locator("[data-question='Q3']");
    await q3.getByRole("button", { name: /Reem buys a phone/ }).click();
    await q3.getByRole("button", { name: /Reem takes a photo/ }).click();
    await expect(q3.locator("[data-order='1']")).toContainText("Reem buys a phone.");
    await expect(q3.locator("[data-order='2']")).toContainText("Reem takes a photo.");
    await submit.click();
    await expect(q1).toContainText("Read the first sentence again.");
    await expect(page.locator("[data-question='Q2']")).toContainText("Well done!");
    await expect(q3).toContainText("Well done!");
    await q1.getByRole("button", { name: /a phone/ }).click();
    await page.getByRole("button", { name: "Submit again" }).click();
    await expect(q1).toContainText("The first sentence says Reem has a new phone.");
    await expect(page.locator("[data-submit='comprehension']")).toContainText("Exercise finished");

    await page.getByLabel("Write here").fill("i have a phone");
    await expect(page.locator("[data-words='4']")).toBeVisible();
    await page.getByRole("button", { name: "Submit my writing" }).click();
    await expect(page.getByText("It is black.")).toBeVisible();
    const feedback = page.locator("[data-writing-feedback='rules']");
    await expect(feedback.locator("[data-criterion='wordCount']")).toContainText("just right");
    await expect(feedback.locator("[data-criterion='punctuation']")).toContainText(
      "Write I with a capital letter.",
    );
    await expect(feedback.locator("[data-criterion]")).toHaveCount(7);

    const { violations: onUnit } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(onUnit.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);

    await page.locator("[data-next-unit='RW-A1P-U03']").click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("A new bag");

    // Staff see what learners did (the Owner previewing leaves no progress behind).
    await page.goto("/en/teacher/units");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Course units");
    await expect(page.getByText("No learner has started a unit yet.")).toBeVisible();
  } finally {
    rmSync(join(DRIVE ?? "", "LinguaPath/01_Content/Units"), { recursive: true, force: true });
    unlinkSync(recording);
  }
});
