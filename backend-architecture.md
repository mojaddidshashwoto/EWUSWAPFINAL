# Skill Swap backend architecture

## Overview

Skill Swap is split into bounded domains that share the Supabase Auth identity (`auth.users`) but keep authorization at the database boundary. The web client uses the publishable Supabase key and relies on Row Level Security (RLS). Sensitive or privileged operations are exposed as `security definer` Postgres functions with a fixed `search_path`, while the tRPC layer provides typed server-side invariants and configuration. Because the selected Supabase project already contained an unrelated lost-and-found application, every Skill Swap database object is namespaced with an `ss_` prefix; the existing `public.profiles`, `public.messages`, and related tables were not modified.

## Domain model

| Domain | Tables / functions | Main responsibility |
| --- | --- | --- |
| Identity | `auth.users`, `profiles`, `verification_requests` | Authentication, profile metadata, NID/student-ID verification lifecycle |
| Discovery | `skill_categories`, `courses`, `leaderboard_top_providers` | Courses, services, category browsing, provider ranking |
| Reputation | `course_reviews`, `has_completed_exchange` | Review eligibility, one review per course/exchange, published ratings |
| Communications | `profile_privacy`, `blocks`, `conversations`, `conversation_members`, `messages`, `call_sessions`, `can_contact` | Privacy-aware messaging and call signaling |
| Social | `social_posts`, `post_likes`, `follows` | Posts, follower graph, visibility-aware feeds |
| Groups | `learning_groups`, `group_members`, `group_sessions` | Group learning spaces and scheduled sessions |
| Money | `escrow_transactions`, `create_escrow`, `submit_escrow_proof`, `verify_escrow_payment`, `release_escrow_payment` | Credit reservation, manual verification, 5% fee, provider settlement |
| Resolution | `disputes`, `dispute_events` | Evidence, staff assignment, refund/release/split decisions |

## Identity verification

The verification flow accepts either `nid` or `student_id`. The application must upload the original document to a **private storage bucket** and persist only a storage reference, the last four characters, and a one-way hash hint. Raw NID or student-ID values must never be stored in Postgres, logs, analytics, client state, or URLs. Moderators move requests through `pending → in_review → verified/rejected`; the applicant can read only their own request, while moderators can review all requests.

The database intentionally separates the verification record from `profiles`. A verified request should be used as an eligibility signal for discovery and provider badges, not as a reason to expose document details to other users.

## Search and discovery

`courses` is indexed by category, status, and instructor. The `normalizeSearchFilters` backend helper clamps ranges and normalizes free text before any query is built. The production query should use full-text search or a generated `tsvector` column for title and description, then apply category, type, credit, rating, verified-provider, availability, and sort filters. The `leaderboard_top_providers` view ranks providers by published average rating, review volume, published course count, and released net credits.

## Messaging and calling

A user can message or call only when `can_contact` returns true. The target user's policy is authoritative: `everyone`, `followers`, `matches`, or `nobody`. A match is represented by a verified or released exchange. Any block by either participant overrides the policy. Message bodies are limited to 5,000 characters, are scoped to conversation members, and can be soft-deleted. `call_sessions` stores signaling state only; media should use an approved WebRTC/SFU provider and never be persisted in the application database.

Privacy defaults are deliberately conservative: messages from followers and calls from exchange matches. The UI should expose toggles for message policy, call policy, online visibility, and activity visibility.

## Social and groups

Posts support `everyone` and `followers` visibility, with authors retaining access to their own posts. Follows and likes are unique pair records, preventing duplicate counts. Private learning groups reveal membership and sessions only to owners and members. Group session `meeting_reference` should be an opaque provider reference, not a public call URL.

## Escrow and 5% platform fee

The escrow lifecycle is:

```text
pending → submitted → verified → released
                    ↘ rejected → submitted (optional retry)
```

At creation, the payer's full gross amount is reserved. The platform fee is **5%**, represented as 500 basis points. For integer credits, the fee is `ceil(gross × 0.05)` with a minimum of one credit; the provider receives `gross - fee`. A two-credit exchange therefore reserves 2 credits, records a 1-credit platform fee, and pays 1 credit to the provider after release. Amounts too small to leave a positive provider settlement are rejected.

Manual verification is intentionally two-step. A moderator first calls `verify_escrow_payment` with `verify` or `reject`. Verification only changes the state to `verified`; it does not pay the provider. A separate `release_escrow_payment` call settles `net_amount_credits` to the provider. Rejection refunds the payer. Both functions are moderator/admin-only, and the state transition plus balance update occur in the same Postgres transaction.

## Disputes

A payer or provider can open one dispute per escrow while the transaction is `submitted` or `verified`. Staff append immutable `dispute_events`, move a dispute through `open → under_review → resolved/appealed → closed`, and select one resolution: `refund_payer`, `release_provider`, `split`, or `no_action`. The actual credit movement should be performed only by a privileged settlement function that records the resolution and prevents double settlement.

## Recommended production controls

1. Enable email confirmation or a trusted identity provider in Supabase Auth.
2. Configure a private storage bucket for verification documents and short-lived signed URLs for moderators.
3. Promote moderators through a controlled admin workflow, never from the client.
4. Add rate limits to auth, messaging, call initiation, post creation, verification requests, and dispute creation.
5. Add an immutable ledger table before introducing cash withdrawals or external payment rails; the current model is credit-based and manual.
6. Add audit logs for role changes, verification decisions, escrow decisions, dispute outcomes, and balance adjustments.
7. Replace the development publishable-key fallback in `client/src/lib/supabase.ts` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at deployment time.

## Files in this implementation

- `supabase/migrations/20260925000000_skill_swap_schema.sql`: core profiles, categories, courses, reviews, and base escrow.
- `supabase/migrations/20260925000001_platform_architecture.sql`: verification, privacy, messaging, calls, social, groups, leaderboard, disputes, and fee-aware escrow. The deployed objects are namespaced as `ss_*`.
- `supabase/migrations/20260925000002_security_hardening.sql`: private conversation creation, participant-only call status transitions, safer RLS helper functions, match-visible posts, and participant-scoped dispute event reads.
- `server/platform.ts`: typed server-side business rules and sanitizers.
- `server/routers.ts`: typed tRPC access to platform configuration, fee quotes, normalized search, and escrow transition checks.
- `client/src/lib/supabase.ts`: publishable-key Supabase client, discovery queries, review creation, escrow RPC calls, and realtime message subscription.
- `server/platform.test.ts`: tests for fee math, privacy, review gating, state transitions, and identity sanitization.

## Deployment status

The three migrations were applied successfully to Supabase project `rohjxwehtxtgeuekpduz`. Verification confirmed 20 new `public.ss_*` tables, 4 seeded skill categories, RLS enabled on every new table, and the live functions `ss_can_contact`, `ss_create_conversation`, `ss_create_escrow`, `ss_submit_escrow_proof`, `ss_verify_escrow_payment`, `ss_release_escrow_payment`, `ss_update_call_status`, and `ss_resolve_dispute`. The private `ss-verification-documents` storage bucket and its owner/staff-only policies were also created. The pre-existing lost-and-found tables remain intact.
