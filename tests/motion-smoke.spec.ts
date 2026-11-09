import { expect, test } from "@playwright/test";

test("public marketplace, category selection, and account forms remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("link", { name: "Explore Skills" }).click();
  await expect(page).toHaveURL(/\/discover$/);

  const designCategory = page.getByRole("button", { name: "Design", exact: true });
  await expect(designCategory).toHaveAttribute("aria-pressed", "false");
  await designCategory.click();
  await expect(designCategory).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByPlaceholder(/Search by skill title/)).toBeVisible();

  await page.goto("/login");
  await expect(page.getByLabel("Email Address")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();

  await page.goto("/signup");
  await expect(page.getByLabel("Full Name")).toBeVisible();
  await expect(page.getByLabel("Email Address")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();

  await page.goto("/forgot-password");
  await expect(page.getByRole("textbox").first()).toBeVisible();
});

test("all protected route entries continue to require authentication", async ({ page }) => {
  const protectedRoutes = [
    "/dashboard",
    "/wallet",
    "/messages",
    "/exchanges",
    "/exchanges/test-id",
    "/community",
    "/groups",
    "/notifications",
    "/profile",
    "/profile/test-id",
    "/settings",
    "/settings/privacy",
    "/onboarding",
    "/admin",
  ];

  for (const route of protectedRoutes) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
  }
});

test("public skill-detail and not-found route patterns render", async ({ page }) => {
  for (const route of ["/skills/nonexistent-skill", "/404", "/unmatched-route"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#root")).not.toBeEmpty();
    expect(page.url()).toContain(route);
  }
});

test("marketplace stays within a narrow touch viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/discover");
  await expect(page.getByPlaceholder(/Search by skill title/)).toBeVisible();
  const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fitsViewport).toBe(true);
});

test("landing page explains a real skill swap without blocking content", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("status", { name: "EWUSwap introduction" })).toHaveCount(0, { timeout: 6000 });

  const exchangeTitle = page.getByRole("heading", { name: "Learn together. Grow together." });
  await exchangeTitle.scrollIntoViewIfNeeded();
  await expect(exchangeTitle).toBeVisible();
  await expect(page.getByText("Student A", { exact: true })).toBeVisible();
  await expect(page.getByText("Student B", { exact: true })).toBeVisible();
  await expect(page.getByText("Graphic Design", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Photography", { exact: true }).first()).toBeVisible();
});
