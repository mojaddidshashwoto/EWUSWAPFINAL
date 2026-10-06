import { test, expect, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://glpoowzygushtxwqmcxl.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MAXkviTqJHRkDOTjKnUTYw_mj0q8Mtp';

async function createTestUser(name: string, label: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const password = 'Password123!';

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        display_name: name,
        role: 'student',
      },
    },
  });

  if (error) {
    throw new Error(`${label} sign-up failed: ${error.message}`);
  }

  return { name, email, password, userId: data.user?.id ?? '' };
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/discover|\/messages/, { timeout: 30000 });
}

async function setWalletBalance(page: Page, amount: number) {
  await page.evaluate(
    async ({ amount, url, key }) => {
      const authTokenKey = Object.keys(localStorage).find((key) => key.startsWith('sb-') && key.includes('auth-token'));
      const authToken = authTokenKey ? JSON.parse(localStorage.getItem(authTokenKey) ?? '{}') : null;
      const accessToken = authToken?.access_token;
      const userId = authToken?.user?.id;

      if (!accessToken || !userId) {
        throw new Error('No authenticated user session was found in localStorage.');
      }

      const response = await fetch(`${url}/rest/v1/rpc/ss_set_bdt_balance_for_testing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: key,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ p_user_id: userId, p_bdt: amount }),
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Set wallet failed: ${response.status} ${text}`);
      }

      return text;
    },
    { amount, url: SUPABASE_URL, key: ANON_KEY }
  );
}

async function createConversation(page: Page, participantId: string) {
  const conversationId = await page.evaluate(
    async ({ participantId, url, key }) => {
      const authTokenKey = Object.keys(localStorage).find((key) => key.startsWith('sb-') && key.includes('auth-token'));
      const authToken = authTokenKey ? JSON.parse(localStorage.getItem(authTokenKey) ?? '{}') : null;
      const accessToken = authToken?.access_token;

      if (!accessToken) {
        throw new Error('No access token available for creating a conversation.');
      }

      const response = await fetch(`${url}/rest/v1/rpc/ss_create_conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: key,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ p_target_id: participantId }),
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Create conversation failed: ${response.status} ${text}`);
      }

      return text;
    },
    { participantId, url: SUPABASE_URL, key: ANON_KEY }
  );

  return conversationId;
}

test.describe('Two-user deal flow', () => {
  test('buyer books a listed service and the provider sees the message', async ({ browser }) => {
    const seller = await createTestUser('Seller QA', 'qa-seller');
    const buyer = await createTestUser('Buyer QA', 'qa-buyer');

    const sellerContext = await browser.newContext();
    const buyerContext = await browser.newContext();

    try {
      const sellerPage = await sellerContext.newPage();
      const buyerPage = await buyerContext.newPage();
      sellerPage.on('console', (message) => {
        if (message.type() === 'error') console.error(`[seller browser] ${message.text()}`);
      });
      sellerPage.on('pageerror', (error) => console.error(`[seller page error] ${error.message}`));
      buyerPage.on('console', (message) => {
        if (message.type() === 'error') console.error(`[buyer browser] ${message.text()}`);
      });
      buyerPage.on('pageerror', (error) => console.error(`[buyer page error] ${error.message}`));

      await login(sellerPage, seller.email, seller.password);
      await sellerPage.goto('/discover');
      await sellerPage.getByRole('button', { name: /post a service/i }).click();

      const listingTitle = `Playwright QA Service ${Date.now()}`;
      await sellerPage.getByLabel('Service title').fill(listingTitle);
      await sellerPage.getByLabel('Description').fill('This service was created by the Playwright QA seller to validate the real two-user escrow and chat flow.');
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

      await setWalletBalance(sellerPage, 500);

      await login(buyerPage, buyer.email, buyer.password);
      await setWalletBalance(buyerPage, 500);
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
      const escrowResponseBody = await escrowResponse.text();
      expect(escrowResponse.ok(), escrowResponseBody).toBeTruthy();
      await expect(buyerPage.getByText(/Escrow reserved for|Transaction/i)).toBeVisible({ timeout: 20000 });

      await buyerPage.goto('/wallet');
      await expect(buyerPage.getByText(/Financial Dashboard & Wallet/i)).toBeVisible({ timeout: 20000 });

      const buyerBalance = await buyerPage.evaluate(async ({ url, key }) => {
        const authTokenKey = Object.keys(localStorage).find((key) => key.startsWith('sb-') && key.includes('auth-token'));
        const auth = authTokenKey ? JSON.parse(localStorage.getItem(authTokenKey) ?? '{}') : null;
        const accessToken = auth?.access_token;
        if (!accessToken) return null;

        const response = await fetch(`${url}/rest/v1/ss_profiles?select=bdt_balance&id=eq.${auth.user.id}`, {
          headers: {
            apikey: key,
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Could not fetch current wallet balance');
        }

        const rows = await response.json();
        return rows[0]?.bdt_balance ?? null;
      }, { url: SUPABASE_URL, key: ANON_KEY });

      console.log(`[QA] escrow RPC ${escrowResponse.status()}: ${escrowResponseBody}; buyer balance: ${buyerBalance}`);
      expect(buyerBalance).toBeLessThan(500);

      const sellerUserId = seller.userId;
      const conversationId = await createConversation(buyerPage, sellerUserId);
      expect(conversationId).toBeTruthy();

      await buyerPage.goto('/messages');
      await buyerPage.reload();
      await buyerPage.getByPlaceholder('Type your message...').fill('Hello from Playwright');
      await buyerPage.locator('form').filter({ has: buyerPage.getByPlaceholder('Type your message...') }).locator('button[type="submit"]').click();
      await expect(buyerPage.getByText('Hello from Playwright')).toBeVisible({ timeout: 15000 });

      await sellerPage.goto('/messages');
      await sellerPage.reload();
      await expect(sellerPage.getByText('Hello from Playwright')).toBeVisible({ timeout: 20000 });

      await expect.soft(buyerPage.locator('body')).not.toContainText('There was a problem');
      await expect.soft(sellerPage.locator('body')).not.toContainText('There was a problem');
    } finally {
      await sellerContext.close();
      await buyerContext.close();
    }
  });
});
