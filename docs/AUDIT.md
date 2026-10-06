# EwuSwap Comprehensive QA & Security Audit

**Repository**: EwuSwap (Skill-Swapping Platform)  
**Branch**: `qa-polish`  
**Date**: October 3, 2026  
**Auditor**: Senior Full-Stack Engineer, Lead SDET & Security Specialist  

---

## Executive Summary

This audit evaluates the EwuSwap codebase against production security standards, multi-user concurrency rules, atomic escrow mechanics, and real-time state integrity. Every finding is backed by verified code paths, database schema definitions, and migration history.

---

## 🚨 TOP-PRIORITY CRITICAL AUDIT FINDING: Single Currency (BDT) Drift

### Audit ID: `AUDIT-CRIT-001` — Dual-Currency Drift & Non-Atomic Currency Model
- **Severity**: **CRITICAL**
- **Location**: `supabase/migrations/20260925000000_skill_swap_schema.sql`, `supabase/migrations/20260926000000_profile_bdt_balance.sql`, `supabase/migrations/20261003000003_multiplayer_messaging_and_escrow_fixes.sql`, `lib/supabase.ts`, `pages/Wallet.tsx`, `pages/Discover.tsx`
- **Root Cause**: The original database schema created `credits_balance integer not null default 0`. Later, migration `20260926000000` added `bdt_balance numeric(12, 2) not null default 0`. However, the RPC functions `ss_create_escrow`, `ss_admin_deposit_credits`, and `ss_release_escrow_payment` exclusively manipulated `credits_balance`. The frontend attempted an ad-hoc 1:120 conversion in UI components, leading to state desynchronization where users' BDT balances remained static while credits were deducted.
- **Resolution Plan**:
  1. Establish `bdt_balance` as the **sole single source of truth** across the entire platform.
  2. Deprecate `credits_balance` (mark as deprecated in schema; do not drop column in this phase).
  3. Migrate all money-moving RPCs (`ss_create_escrow`, `ss_submit_escrow_proof`, `ss_release_escrow_payment`, `ss_resolve_dispute`, `ss_admin_deposit_bdt`) to operate strictly and atomically on `bdt_balance`.
  4. Redesign all UI components, modals, onboarding, discovery filters, and tests to display and process **৳ BDT** natively without pseudo-credits.

### Read-Only Balance Reconciliation Query
To identify any users in production where `credits_balance` and `bdt_balance` have drifted apart prior to executing migration adjustments:

```sql
-- Read-Only Balance Reconciliation Inspection
SELECT 
  p.id AS user_id,
  p.display_name,
  u.email,
  p.credits_balance,
  p.bdt_balance,
  (p.credits_balance * 120.00) AS imputed_bdt_from_credits,
  (p.bdt_balance - (p.credits_balance * 120.00)) AS variance_bdt,
  p.created_at
FROM public.ss_profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.bdt_balance <> (p.credits_balance * 120.00)
   OR (p.bdt_balance = 0 AND p.credits_balance > 0)
ORDER BY p.created_at DESC;
```

> **Owner Action Required**: Please execute the above read-only query on the database and confirm if any legacy user rows require specific manual balance adjustment. In our automated test environment, test accounts will be initialized with native BDT balances.

---

## Detailed Sectional Audit

### A. New-User Journey & Authentication
| Finding ID | Severity | Area | Evidence & Code Path | Recommendation |
|---|---|---|---|---|
| `AUDIT-A01` | **HIGH** | Signup Terms Checkbox | `pages/Signup.tsx:193-203` Radix UI Checkbox `onCheckedChange` properly sets `agreeTerms`. However, default `agreeTerms` was initialized to `true` instead of requiring explicit user opt-in, and lacked animated visual feedback on error. | Set initial state to `false` for compliance, add shake/glow animation when submitted without checking. |
| `AUDIT-A02` | **HIGH** | Profile Creation Synchronization | `pages/Signup.tsx:46-66` vs `20260925000000_skill_swap_schema.sql:159-180` `ss_handle_new_user` trigger creates `ss_profiles` and `ss_profile_privacy` rows, but initial `bdt_balance` was not explicitly set to starting signup bonus in BDT. | Update trigger to provide starter balance in `bdt_balance` (e.g. ৳500 BDT) upon verified signup. |
| `AUDIT-A03` | **MEDIUM** | Auth State Flash | `App.tsx:28-47` `ProtectedRoute` renders an empty spinner during initial auth hydration before redirecting, causing a slight layout jump. | Implement smooth cross-fade animation with branded skeleton layout. |

---

### B. Route Guards & Role Enforcement
| Finding ID | Severity | Area | Evidence & Code Path | Recommendation |
|---|---|---|---|---|
| `AUDIT-B01` | **HIGH** | Admin Route Authorization | `App.tsx:50-74` Client-side `hasRole(["admin", "moderator"])` checks auth metadata. The backend tables and views also enforce `ss_is_staff()`. | Keep both layers synchronized; ensure `AdminDashboard` gracefully displays unauthorized notice if server RPC rejects non-staff callers. |
| `AUDIT-B02` | **LOW** | 404 Deep Link Handling | `vercel.json` rewrite `{ "source": "/(.*)", "destination": "/index.html" }` exists, ensuring single-page routing works on direct URL refreshes. | Add dynamic error boundaries and animated 404 return home transitions. |

---

### C. Discovery & SkillDetail
| Finding ID | Severity | Area | Evidence & Code Path | Recommendation |
|---|---|---|---|---|
| `AUDIT-C01` | **HIGH** | Listing Currency Pricing | `pages/Discover.tsx:154`, `pages/SkillDetail.tsx:23` Listings used `creditCost` (e.g. 24 credits) with hardcoded multiplier `creditCost * 120`. | Standardize `ss_courses.bdt_price` / `price_bdt` as the single price field across discovery and listing creation. |
| `AUDIT-C02` | **MEDIUM** | Self-Listing Prevention in Discovery | `pages/SkillDetail.tsx:82` `isOwnListing` successfully blocks self-booking in the UI. | Retain UI indicator and reinforce at database RPC level. |

---

### D. Booking Rules & Escrow Mechanics
| Finding ID | Severity | Area | Evidence & Code Path | Recommendation |
|---|---|---|---|---|
| `AUDIT-D01` | **CRITICAL** | Atomic BDT Escrow Lock | `supabase/migrations/20261003000003:148-199` `ss_create_escrow` used `p_amount_credits` and updated `credits_balance`. | Create new migration with `ss_create_escrow_bdt(p_payee_id uuid, p_course_id uuid, p_amount_bdt numeric, p_payer_note text)` with strict `FOR UPDATE` row lock on `ss_profiles.bdt_balance`. |
| `AUDIT-D02` | **HIGH** | Fee Calculation Accuracy | `platform.ts:1-25` 5% platform fee (500 bps) math: `platformFeeBdt = Math.round(amountBdt * 0.05)`, `netBdt = amountBdt - platformFeeBdt`. | Ensure identical integer/decimal fee calculation in both Postgres function and frontend preview quote. |
| `AUDIT-D03` | **HIGH** | Self-Booking RPC Guard | `ss_create_escrow` line 169: `if v_payer_id = p_payee_id then raise exception 'payer and payee must be different'; end if;` | Verified working and enforced inside the database. |

---

### E. Wallet & Escrow Lifecycle
| Finding ID | Severity | Area | Evidence & Code Path | Recommendation |
|---|---|---|---|---|
| `AUDIT-E01` | **CRITICAL** | Money Conservation Invariant | Invariant: `Payer Balance + Escrow Held + Platform Fees + Payee Balance = Constant`. | Enforce in all state transitions: `create_escrow` (deducts payer, locks in escrow), `release_escrow` (credits payee net, records fee), `refund_escrow` (credits payer gross). |
| `AUDIT-E02` | **HIGH** | RLS Direct Balance Mutation Block | `20261003000002_profile_balance_rpc_fix.sql:2-8` Revoked update on `credits_balance` and `bdt_balance` from `authenticated` role. Only SECURITY DEFINER RPCs can mutate balances. | Retain and verify in automated test suite. |

---

### F. Realtime & Multi-User State Synchronization
| Finding ID | Severity | Area | Evidence & Code Path | Recommendation |
|---|---|---|---|---|
| `AUDIT-F01` | **HIGH** | Wallet Realtime Channel | `pages/Wallet.tsx:103-108` Subscribes to `ss_profiles` and `ss_escrow_transactions`. | Ensure both `ss_profiles` and `ss_escrow_transactions` are present in `supabase_realtime` publication. |
| `AUDIT-F02` | **MEDIUM** | Realtime Messaging Duplication | `pages/Messages.tsx` Optimistic UI insertion + Realtime event listener could create duplicate messages if IDs are not deduplicated by UUID. | Implement `Set` / unique key deduplication in chat drawer state. |

---

### G. Messaging & Communication Privacy
| Finding ID | Severity | Area | Evidence & Code Path | Recommendation |
|---|---|---|---|---|
| `AUDIT-G01` | **HIGH** | Contact Policy Enforcement | `ss_can_contact` in `20261003000003` defaults message policy to `everyone` while allowing users to restrict to `followers` or `matches`. | Tested and verified in migration `20261003000003`. |
| `AUDIT-G02` | **MEDIUM** | Message Scoping | `ss_messages` RLS ensures only members of `ss_conversation_members` can SELECT or INSERT messages into a given conversation ID. | Verified RLS policy `ss_messages_select_member`. |

---

### H. Fulfillment, Disputes, Reviews
| Finding ID | Severity | Area | Evidence & Code Path | Recommendation |
|---|---|---|---|---|
| `AUDIT-H01` | **HIGH** | Peer-to-Peer Satisfaction Release | `pages/Exchanges.tsx` Buyer should be able to directly release escrow to provider upon session completion, in addition to moderator resolution. | Add `ss_release_escrow_by_payer(p_transaction_id uuid)` RPC so buyers can directly release held funds to sellers without administrative bottlenecks. |
| `AUDIT-H02` | **MEDIUM** | Review Gating | `ss_has_completed_exchange` checks `ss_escrow_transactions.status in ('verified', 'released')`. | Enforces one review per completed exchange. |

---

### I. Security & Database Hardening
| Finding ID | Severity | Area | Evidence & Code Path | Recommendation |
|---|---|---|---|---|
| `AUDIT-I01` | **HIGH** | Search Path Hardening | All SECURITY DEFINER functions must include `SET search_path = public`. | Verified on all `ss_*` functions. |
| `AUDIT-I02` | **HIGH** | Service Role Key Isolation | Never expose `SUPABASE_SERVICE_ROLE_KEY` in `client/` or `VITE_` variables. | Verified clean in `.env` and client bundles. |

---

### J. Frontend Motion, UI & Design Quality
| Finding ID | Severity | Area | Evidence & Code Path | Recommendation |
|---|---|---|---|---|
| `AUDIT-J01` | **MEDIUM** | Motion Micro-Interactions | Framer Motion animations for cards, modals, tabs, and wallet balance counters enhance UX significantly. | Implement smooth spring transitions, count-up animations for BDT balance, and animated checkmarks. |
| `AUDIT-J02` | **MEDIUM** | Responsive Mobile Layout | Verify padding and touch targets across 375px mobile, tablet, and desktop viewports. | Ensure bottom navigation / drawer on small screens. |

---

## Ranked Audit Matrix

| Rank | Audit ID | Description | Component | Target Phase |
|---|---|---|---|---|
| **1 (CRITICAL)** | `AUDIT-CRIT-001` | Single BDT currency migration (`bdt_balance`) & deprecation of credits | DB / RPC / UI | Phase 3 |
| **2 (CRITICAL)** | `AUDIT-D01` | Atomic BDT Escrow booking with strict `FOR UPDATE` lock & money conservation | DB / RPC | Phase 3 |
| **3 (HIGH)** | `AUDIT-H01` | Buyer Direct Escrow Release RPC (`ss_release_escrow_by_payer`) | DB / RPC / UI | Phase 3 |
| **4 (HIGH)** | `AUDIT-E02` | RLS balance write protection against direct client mutations | DB RLS | Phase 3 |
| **5 (HIGH)** | `AUDIT-G01` | Direct messaging RLS & conversation security | DB / Messages | Phase 3 |
| **6 (HIGH)** | `AUDIT-C01` | Discover & SkillDetail BDT pricing conversion | UI / Pages | Phase 3 |
| **7 (MEDIUM)** | `AUDIT-A01` | Signup Terms checkbox interactive animations & validation | UI / Auth | Phase 3/4 |
| **8 (MEDIUM)** | `AUDIT-J01` | Framer Motion animations, BDT balance counter, checkout spring modal | UI / Motion | Phase 4 |
| **9 (LOW)** | `AUDIT-B02` | 404 animated state & error recovery | UI / Core | Phase 3/4 |

---

*This document is maintained as the source of truth for all fixes in Phase 3 and Phase 4 on branch `qa-polish`.*
