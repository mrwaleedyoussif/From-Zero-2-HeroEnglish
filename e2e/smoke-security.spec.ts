import { expect, test } from "@playwright/test";

// Production-safe smoke checks (no sign-in, no writes): run with `npm run test:smoke` and
// E2E_BASE_URL=https://<your domain> after every deploy (docs/RUNBOOK.md).

test("pages send strict security headers with a per-request CSP nonce", async ({ request }) => {
  const res = await request.get("/en");
  expect(res.status()).toBe(200);
  const h = res.headers();
  expect(h["content-security-policy"]).toMatch(
    /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/,
  );
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  const again = (await request.get("/en")).headers()["content-security-policy"];
  expect(again).not.toBe(h["content-security-policy"]); // a fresh nonce each time
});

test("no script is blocked by the CSP and the pages hydrate", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy|Refused to/i.test(m.text()))
      problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(e.message));
  for (const path of ["/en", "/ar/login", "/en/student-login"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  // Interactive = hydrated: the theme toggle runs client code.
  await page.goto("/en");
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark|light/);
  expect(problems).toEqual([]);
});

test("signed-out visitors can't reach portals or private data", async ({ page, request }) => {
  await page.goto("/en/student");
  await expect(page).toHaveURL(/\/(en\/)?(login|student-login)/);
  for (const path of ["/api/export/classes", "/api/media/00000000-0000-4000-8000-000000000000"])
    expect([401, 404]).toContain((await request.get(path)).status());
  expect((await request.post("/api/cron/tick")).status()).toBe(401);
});

test("unknown pages show the friendly, translated 404", async ({ page }) => {
  const res = await page.goto("/ar/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("لم نجد هذه الصفحة");
});
