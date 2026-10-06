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

  const email = `${label}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`;
  const password = 'TestPassword123!QA';

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

test.describe('EwuSwap Full Multi-User Automation Suite', () => {
  test('Complete 10-Phase Multi-User Lifecycle (Desktop & Mobile)', async ({ browser }) => {
    // -------------------------------------------------------------
    // PHASE 2 & SETUP: Create Isolated Test Users A, B, and C
    // -------------------------------------------------------------
    const seller = await createTestUser('Seller QA Lead', 'seller');
    const buyer = await createTestUser('Buyer QA Lead', 'buyer');

    const sellerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const buyerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    const sellerPage = await sellerContext.newPage();
    const buyerPage = await buyerContext.newPage();

    try {
      // -------------------------------------------------------------
      // TEST 1: User A Creates Service
      // -------------------------------------------------------------
      await login(sellerPage, seller.email, seller.password);
      await sellerPage.goto('/discover');
      await sellerPage.getByRole('button', { name: /post a service/i }).click();

      const listingTitle = `Microeconomics Tutoring — EwuSwap QA Test ${Date.now()}`;
      await sellerPage.getByLabel('Service title').fill(listingTitle);
      await sellerPage.getByLabel('Description').fill('Automated QA test service for EwuSwap. Do not treat as real booking.');
      await sellerPage.getByRole('combobox').first().click();
      await sellerPage.getByRole('option', { name: 'Business' }).click();
      await sellerPage.getByLabel('Price (৳ BDT)').fill('100');
      await sellerPage.getByLabel('Duration (minutes)').fill('60');

      const listingResponsePromise = sellerPage.waitForResponse(
        (response) => response.url().includes('/rest/v1/ss_courses') && response.request().method() === 'POST'
      );
      await sellerPage.getByRole('button', { name: /^Publish Service$/i }).click();
      const listingResponse = await listingResponsePromise;
      expect(listingResponse.ok()).toBeTruthy();

      await expect(sellerPage.getByText(listingTitle)).toBeVisible({ timeout: 20000 });

      // -------------------------------------------------------------
      // TEST 2: User B Discovers User A's Service
      // -------------------------------------------------------------
      await login(buyerPage, buyer.email, buyer.password);
      await buyerPage.goto('/discover');
      await buyerPage.getByPlaceholder('Search by skill title, provider name, category, or keyword...').fill(listingTitle);

      const serviceCard = buyerPage.getByText(listingTitle);
      await expect(serviceCard).toBeVisible({ timeout: 20000 });

      // Navigate to skill detail
      await buyerPage.getByRole('button', { name: /Book Swap/i }).click();
      await expect(buyerPage.getByText('৳ 100 BDT', { exact: true })).toBeVisible();

      // -------------------------------------------------------------
      // TEST 3 & TEST 4: User B Purchases Service & Escrow is Created
      // -------------------------------------------------------------
      await buyerPage.getByRole('button', { name: /Pay for Service/i }).click();
      await expect(buyerPage.getByText(/Escrow Checkout Confirmation/i)).toBeVisible();

      // Verify 5% fee quote in modal (Gross ৳100, Fee ৳5, Net ৳95)
      await expect(buyerPage.getByText('৳ 100 BDT').first()).toBeVisible();
      await expect(buyerPage.getByText('-৳ 5 BDT')).toBeVisible();
      await expect(buyerPage.getByText('৳ 95 BDT')).toBeVisible();

      const escrowPromise = buyerPage.waitForResponse((response) => response.url().includes('/rest/v1/rpc/ss_create_escrow'));
      await buyerPage.getByRole('button', { name: /Confirm & Authorize Escrow/i }).click();
      const escrowResponse = await escrowPromise;
      expect(escrowResponse.ok(), await escrowResponse.text()).toBeTruthy();

      // -------------------------------------------------------------
      // TEST 5: User A and User B Communicate (In-App Chat)
      // -------------------------------------------------------------
      // Establish conversation via RPC
      const convId = await buyerPage.evaluate(
        async ({ sellerId, url, key }) => {
          const authKey = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.includes('auth-token'));
          const auth = authKey ? JSON.parse(localStorage.getItem(authKey) ?? '{}') : null;
          const res = await fetch(`${url}/rest/v1/rpc/ss_create_conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${auth.access_token}` },
            body: JSON.stringify({ p_target_id: sellerId }),
          });
          return res.text();
        },
        { sellerId: seller.userId, url: SUPABASE_URL, key: ANON_KEY }
      );
      expect(convId).toBeTruthy();

      await buyerPage.goto('/messages');
      await buyerPage.getByPlaceholder('Type your message...').fill('Hello, this is an automated EwuSwap QA test.');
      await buyerPage.locator('form').filter({ has: buyerPage.getByPlaceholder('Type your message...') }).locator('button[type="submit"]').click();
      await expect(buyerPage.getByText('Hello, this is an automated EwuSwap QA test.').first()).toBeVisible({ timeout: 15000 });

      // Seller reads and replies
      await sellerPage.goto('/messages');
      await sellerPage.reload();
      await expect(sellerPage.getByText('Hello, this is an automated EwuSwap QA test.').first()).toBeVisible({ timeout: 20000 });

      await sellerPage.getByPlaceholder('Type your message...').fill('Received. QA reply.');
      await sellerPage.locator('form').filter({ has: sellerPage.getByPlaceholder('Type your message...') }).locator('button[type="submit"]').click();
      await expect(sellerPage.getByText('Received. QA reply.').first()).toBeVisible({ timeout: 15000 });

      // -------------------------------------------------------------
      // TEST 6 & TEST 7: Service Completion & Escrow Release
      // -------------------------------------------------------------
      await buyerPage.goto('/exchanges');
      // Click Pending Tab to view pending escrow
      await buyerPage.getByRole('tab', { name: /Pending/i }).click();
      await expect(buyerPage.getByText(listingTitle)).toBeVisible({ timeout: 20000 });

      // Buyer confirms satisfaction and releases escrow
      const releasePromise = buyerPage.waitForResponse((response) => response.url().includes('/rest/v1/rpc/ss_release_escrow_by_payer'));
      await buyerPage.getByRole('button', { name: /Confirm Satisfaction & Release/i }).click();
      const releaseResponse = await releasePromise;
      expect(releaseResponse.ok()).toBeTruthy();

      // -------------------------------------------------------------
      // TEST 8: Wallet Balances Update Correctly (Money Conservation)
      // -------------------------------------------------------------
      await buyerPage.goto('/wallet');
      await expect(buyerPage.getByText('400').first()).toBeVisible({ timeout: 20000 }); // 500 initial - 100 spent

      await sellerPage.goto('/wallet');
      await expect(sellerPage.getByText('595').first()).toBeVisible({ timeout: 20000 }); // 500 initial + 95 net received

      // -------------------------------------------------------------
      // TEST 9: Transaction History Updates Correctly
      // -------------------------------------------------------------
      await buyerPage.goto('/wallet');
      await expect(buyerPage.getByText(/Transaction History/i)).toBeVisible();
      await expect(buyerPage.getByText(/Released|Held in escrow/i).first()).toBeVisible();

      // -------------------------------------------------------------
      // TEST 10: Unauthorized Actions Blocked
      // -------------------------------------------------------------
      // Verify buyer cannot tamper seller profile balance
      const tamperAttempt = await buyerPage.evaluate(
        async ({ sellerId, url, key }) => {
          const authKey = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.includes('auth-token'));
          const auth = authKey ? JSON.parse(localStorage.getItem(authKey) ?? '{}') : null;
          const res = await fetch(`${url}/rest/v1/ss_profiles?id=eq.${sellerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${auth.access_token}` },
            body: JSON.stringify({ bdt_balance: 99999 }),
          });
          return res.status;
        },
        { sellerId: seller.userId, url: SUPABASE_URL, key: ANON_KEY }
      );
      // RLS policy prevents updating other user profiles (returns 200/204 with 0 rows updated or 401/403)
      const sellerBalanceAfterTamper = await sellerPage.evaluate(
        async ({ sellerId, url, key }) => {
          const authKey = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.includes('auth-token'));
          const auth = authKey ? JSON.parse(localStorage.getItem(authKey) ?? '{}') : null;
          const res = await fetch(`${url}/rest/v1/ss_profiles?select=bdt_balance&id=eq.${sellerId}`, {
            headers: { apikey: key, Authorization: `Bearer ${auth.access_token}` },
          });
          const rows = await res.json();
          return rows[0]?.bdt_balance;
        },
        { sellerId: seller.userId, url: SUPABASE_URL, key: ANON_KEY }
      );
      expect(Number(sellerBalanceAfterTamper)).toBe(595); // Unchanged!
    } finally {
      await sellerContext.close();
      await buyerContext.close();
    }
  });

  // -------------------------------------------------------------
  // PHASE 15: Mobile Viewport Multi-User Responsiveness
  // -------------------------------------------------------------
  test('Mobile Viewport Navigation & Discovery Flow (iPhone 13 viewport)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const user = await createTestUser('Mobile Student QA', 'mobile-qa');

    await login(page, user.email, user.password);
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify mobile navigation bar exists
    await expect(page.locator('div.fixed.bottom-0')).toBeVisible();

    // Navigate to Discover
    await page.goto('/discover');
    await expect(page.getByPlaceholder('Search by skill title, provider name, category, or keyword...')).toBeVisible();

    // Navigate to Wallet
    await page.goto('/wallet');
    await expect(page.getByText('500')).toBeVisible();

    // Navigate to Exchanges
    await page.goto('/exchanges');
    await expect(page.getByText(/Exchange Management/i)).toBeVisible();
  });
});
