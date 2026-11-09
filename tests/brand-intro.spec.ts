import { expect, test } from "@playwright/test";

test("plays the cinematic intro once per browser session", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const intro = page.getByRole("status", { name: "EWUSwap introduction" });
  await expect(intro).toBeVisible();
  await expect(intro.getByRole("img", { name: "EWUSwap" })).toBeVisible();
  await expect(intro).toHaveCount(0, { timeout: 6000 });
  await expect(page.getByRole("heading", { name: /Teach what you know/ })).toBeVisible();

  await page.goto("/discover", { waitUntil: "domcontentloaded" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("status", { name: "EWUSwap introduction" })).toHaveCount(0);
});

test("skips the intro for reduced motion and fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("status", { name: "EWUSwap introduction" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Teach what you know/ })).toBeVisible();
  const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fitsViewport).toBe(true);
});
