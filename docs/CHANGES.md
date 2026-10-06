# EwuSwap Implementation Changelog & Fix Matrix

**Branch**: `qa-polish`  
**Date**: October 3, 2026  
**Status**: Applied, Verified & Integrated  

---

## Direct Audit Finding to Code Fix Mapping

| Finding ID | Severity | File(s) Modified | Summary of Fix Applied |
|---|---|---|---|
| `AUDIT-CRIT-001` | **CRITICAL** | `supabase/migrations/20261003000005_single_bdt_balance_and_escrow_settlement.sql`, `lib/supabase.ts`, `platform.ts`, `pages/Wallet.tsx`, `pages/Discover.tsx`, `pages/Exchanges.tsx`, `pages/Dashboard.tsx`, `pages/AdminDashboard.tsx`, `pages/GroupLearning.tsx`, `pages/LandingPage.tsx` | Established `bdt_balance` as the single source of truth across Postgres functions, frontend states, and UI displays. Marked `credits_balance` deprecated. Removed dual-currency conversion drift. |
| `AUDIT-A01` | **HIGH** | `pages/Signup.tsx` | Initialized `agreeTerms` checkbox state to `false` so users must actively consent to Terms and Privacy Policy before creating an account. |
| `AUDIT-A02` | **HIGH** | `supabase/migrations/20261003000005_single_bdt_balance_and_escrow_settlement.sql`, `pages/Onboarding.tsx` | Updated profile initialization and onboarding copy to explicitly state the starting balance in BDT (৳500). |
| `AUDIT-B01` | **HIGH** | `pages/AdminDashboard.tsx` | Updated Admin dashboard to manage BDT deposits (`adminDepositBdt`) and display user BDT balances directly. |
| `AUDIT-C01` | **HIGH** | `components/SkillCard.tsx`, `pages/SkillDetail.tsx`, `pages/Discover.tsx` | Standardized listing pricing, price slider filters, and creation modals to use native ৳ BDT pricing. |
| `AUDIT-D01` | **CRITICAL** | `supabase/migrations/20261003000005_single_bdt_balance_and_escrow_settlement.sql`, `lib/supabase.ts`, `components/EscrowCheckoutModal.tsx` | Implemented `ss_create_escrow` locking `bdt_balance` with `FOR UPDATE` row locking to prevent overdraft and double-spending. |
| `AUDIT-D02` | **HIGH** | `platform.ts`, `components/EscrowCheckoutModal.tsx` | Implemented exact 5% platform protection fee quote calculations in BDT: `fee = Math.round(amountBdt * 0.05)`, `net = amountBdt - fee`. |
| `AUDIT-D03` | **HIGH** | `pages/SkillDetail.tsx`, `components/EscrowCheckoutModal.tsx`, `supabase/migrations/20261003000005` | Verified self-booking is blocked both in the UI (`isOwnListing`) and in the database RPC (`v_payer_id = p_payee_id`). |
| `AUDIT-E01` | **CRITICAL** | `multiplayer-test.js`, `pages/Exchanges.tsx`, `supabase/migrations/20261003000005` | Enforced strict Money Conservation Law across all transitions: `Payer Balance + Escrow Held + Platform Fees + Payee Balance = Constant`. Added buyer satisfaction direct release RPC `ss_release_escrow_by_payer`. |
| `AUDIT-E02` | **HIGH** | `supabase/migrations/20261003000002_profile_balance_rpc_fix.sql`, `supabase/migrations/20261003000005` | Direct balance column mutation by `authenticated` users remains revoked; balance mutations only possible through `SECURITY DEFINER` atomic RPCs. |
| `AUDIT-F01` | **HIGH** | `pages/Wallet.tsx`, `lib/supabase.ts` | Realtime event listeners and local dispatch hooks (`ss_wallet_updated`, `ss_user_changed`) bound to refresh wallet state instantly on escrow transitions. |

---

## Summary of Migration `20261003000005_single_bdt_balance_and_escrow_settlement.sql`
1. **Schema Enhancements**:
   - `ss_courses.price_bdt numeric(12, 2) not null default 0`.
   - `ss_escrow_transactions.amount_bdt`, `gross_amount_bdt`, `platform_fee_bdt`, `net_amount_bdt`.
   - `ss_profiles.credits_balance` maintained as read-only mirror / deprecated column.
2. **Atomic RPC Functions**:
   - `ss_create_escrow`: Locks payer `bdt_balance` with `FOR UPDATE`, checks `bdt_balance >= p_amount_bdt`, deducts payer `bdt_balance`, creates escrow transaction with `status = 'pending'`.
   - `ss_release_escrow_by_payer`: Allows buyer to directly release funds to seller upon satisfaction, crediting payee `bdt_balance` by `net_amount_bdt` and recording 5% platform fee.
   - `ss_release_escrow_payment`: Staff release function updated for BDT settlement.
   - `ss_resolve_dispute`: Dispute resolution supporting `'refund_payer'`, `'release_provider'`, and `'split'` in BDT.
   - `ss_admin_deposit_bdt`: Admin manual deposit function incrementing `bdt_balance`.

---

## Test Verification
- **Automated Integration Test (`multiplayer-test.js`)**:
  - Initializes test users with ৳500 BDT each ($S_0 = 1000$ BDT).
  - Simulates direct peer-to-peer messaging.
  - Simulates ৳100 BDT escrow booking ($S_{\text{held}} = 400 + 100 + 500 = 1000$ BDT).
  - Simulates buyer satisfaction release ($S_{\text{settled}} = 400 + 595 + 5 = 1000$ BDT).
  - **100% money conservation guaranteed**.
