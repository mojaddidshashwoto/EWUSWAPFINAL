import { test, expect, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) to run this test.');
}

async function createTestUser(name: string, label: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const password = 'Password123!';
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: name, display_name: name, role: 'student' } },
  });
  if (error) throw new Error(`${label} sign-up failed: ${error.message}`);

  return { name, email, password, userId: data.user?.id ?? '' };
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/discover|\/messages/, { timeout: 30000 });
}

test.describe('Two-user booking and messaging', () => {
  test('booking creates a chat that both participants can use', async ({ browser }) => {
    const seller = await createTestUser('Seller QA', 'qa-seller');
    const buyer = await createTestUser('Buyer QA', 'qa-buyer');
    const sellerContext = await browser.newContext();
    const buyerContext = await browser.newContext();

    try {
      const sellerPage = await sellerContext.newPage();
      const buyerPage = await buyerContext.newPage();

      await login(sellerPage, seller.email, seller.password);
      await sellerPage.goto('/discover');
      await sellerPage.getByRole('button', { name: /post a service/i }).click();

      const listingTitle = `Playwright QA Service ${Date.now()}`;
      await sellerPage.getByLabel('Service title').fill(listingTitle);
      await sellerPage.getByLabel('Description').fill('Validate the real two-user escrow and chat flow with this automated listing.');
      await sellerPage.getByRole('combobox').first().click();
      await sellerPage.getByRole('option', { name: 'Design' }).click();
      await sellerPage.getByLabel('Price (৳ BDT)').fill('250');
      await sellerPage.getByLabel('Duration (minutes)').fill('60');

      const listingResponsePromise = sellerPage.waitForResponse((response) =>
        response.url().includes('/rest/v1/ss_courses') && response.request().method() === 'POST'
      );
      await sellerPage.getByRole('button', { name: /^Publish Service$/i }).click();
      const listingResponse = await listingResponsePromise;
      expect(listingResponse.ok(), await listingResponse.text()).toBeTruthy();
      await expect(sellerPage.getByText(listingTitle)).toBeVisible({ timeout: 30000 });

      await login(buyerPage, buyer.email, buyer.password);
      await buyerPage.goto('/discover');
      await buyerPage.getByPlaceholder('Search by skill title, provider name, category, or keyword...').fill(listingTitle);
      await buyerPage.getByRole('button', { name: /Book Swap/i }).click();
      await expect(buyerPage).toHaveURL(/\/skills\//, { timeout: 20000 });
      await buyerPage.getByRole('button', { name: /Pay for Service/i }).click();

      const escrowResponsePromise = buyerPage.waitForResponse((response) =>
        response.url().includes('/rest/v1/rpc/ss_create_escrow')
      );
      await buyerPage.getByRole('button', { name: /Confirm & Authorize Escrow/i }).click();
      const escrowResponse = await escrowResponsePromise;
      expect(escrowResponse.ok(), await escrowResponse.text()).toBeTruthy();

      await expect(buyerPage).toHaveURL(/\/messages/, { timeout: 20000 });
      await buyerPage.getByPlaceholder('Type your message...').fill('Hello from the booking chat');
      await buyerPage.locator('form').filter({ has: buyerPage.getByPlaceholder('Type your message...') }).locator('button[type="submit"]').click();
      await expect(buyerPage.getByText('Hello from the booking chat')).toBeVisible({ timeout: 15000 });

      await sellerPage.goto('/messages');
      await expect(sellerPage.getByText('Hello from the booking chat')).toBeVisible({ timeout: 20000 });
      await sellerPage.getByPlaceholder('Type your message...').fill('Reply from the provider');
      await sellerPage.locator('form').filter({ has: sellerPage.getByPlaceholder('Type your message...') }).locator('button[type="submit"]').click();
      await expect(sellerPage.getByText('Reply from the provider')).toBeVisible({ timeout: 15000 });

      await expect(buyerPage.getByText('Reply from the provider')).toBeVisible({ timeout: 20000 });
      await expect.soft(buyerPage.locator('body')).not.toContainText('There was a problem');
      await expect.soft(sellerPage.locator('body')).not.toContainText('There was a problem');
    } finally {
      await sellerContext.close();
      await buyerContext.close();
    }
  });
});
