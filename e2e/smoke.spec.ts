import { expect, test } from "@playwright/test";

test("root redirects to a locale", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(en|ar)$/);
});

test("English page is left-to-right", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zero-2-Hero English");
});

test("Arabic page is right-to-left", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zero-2-Hero English");
});

test("language switcher flips direction", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "العربية" }).click();
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("dark mode toggle", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/en");
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("the site can be installed as an app", async ({ page, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toContain("512x512");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);

  await page.goto("/en/login");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  // No one-tap install in the test browser: the button explains how instead.
  await page.getByRole("button", { name: "Install the app" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Install app|Add to/ })).toBeVisible();
});
