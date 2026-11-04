-- Read-only migration fingerprint check. This does not apply or modify schema.
-- "applied" means all listed fingerprints currently exist; later migrations can
-- replace or drop objects, so this is not a substitute for Supabase history.
with migration_expectations(
  filename, tables, columns, functions, policies, triggers
) as (
  values
    (
      '20260925000000_skill_swap_schema.sql',
      array['public.ss_profiles', 'public.ss_skill_categories', 'public.ss_courses', 'public.ss_course_reviews', 'public.ss_escrow_transactions']::text[],
      array['public.ss_profiles.id', 'public.ss_courses.instructor_id', 'public.ss_course_reviews.reviewer_id', 'public.ss_escrow_transactions.payer_id']::text[],
      array['public.ss_is_staff()', 'public.ss_handle_new_user()', 'public.ss_create_escrow(uuid, uuid, integer, text)']::text[],
      array['public.ss_courses.ss_courses_select_published', 'public.ss_escrow_transactions.ss_escrow_select_participant']::text[],
      array['public.ss_profiles.ss_profiles_set_updated_at', 'auth.users.ss_on_auth_user_created']::text[]
    ),
    (
      '20260925000001_platform_architecture.sql',
      array['public.ss_verification_requests', 'public.ss_profile_privacy', 'public.ss_blocks', 'public.ss_conversations', 'public.ss_conversation_members', 'public.ss_messages', 'public.ss_call_sessions', 'public.ss_social_posts', 'public.ss_post_likes', 'public.ss_follows', 'public.ss_learning_groups', 'public.ss_group_members', 'public.ss_group_sessions', 'public.ss_disputes', 'public.ss_dispute_events', 'public.ss_leaderboard_top_providers']::text[],
      array['public.ss_escrow_transactions.gross_amount_credits', 'public.ss_profile_privacy.message_policy', 'public.ss_messages.conversation_id', 'public.ss_group_sessions.meeting_reference', 'public.ss_disputes.escrow_transaction_id']::text[],
      array['public.ss_can_contact(uuid, uuid, text)', 'public.ss_create_conversation(uuid)', 'public.ss_create_escrow(uuid, uuid, integer, text)']::text[],
      array['public.ss_profile_privacy.ss_privacy_select_self', 'public.ss_conversations.ss_conversations_select_member', 'public.ss_disputes.ss_disputes_select_participant_or_staff']::text[],
      array[]::text[]
    ),
    (
      '20260925000002_security_hardening.sql',
      array[]::text[],
      array[]::text[],
      array['public.ss_is_group_member(uuid)', 'public.ss_update_call_status(uuid, public.ss_call_status)']::text[],
      array['public.ss_conversation_members.ss_conversation_members_select_member', 'public.ss_group_members.ss_group_members_select_member', 'public.ss_messages.ss_messages_insert_allowed']::text[],
      array[]::text[]
    ),
    (
      '20260925000003_profile_management.sql',
      array['storage.objects']::text[],
      array['public.ss_profile_privacy.show_skills', 'public.ss_profile_privacy.show_email']::text[],
      array[]::text[],
      array['storage.objects.ss_profile_avatars_public_read', 'storage.objects.ss_profile_avatars_owner_insert', 'storage.objects.ss_profile_avatars_owner_update', 'storage.objects.ss_profile_avatars_owner_delete']::text[],
      array[]::text[]
    ),
    (
      '20260925000004_profile_details.sql',
      array[]::text[],
      array['public.ss_profiles.education', 'public.ss_profiles.skills', 'public.ss_profiles.certifications']::text[],
      array[]::text[],
      array[]::text[],
      array[]::text[]
    ),
    (
      '20260925000005_ewuswap_backend_updates.sql',
      array['public.ss_leaderboard_top_providers']::text[],
      array['public.ss_profiles.availability_status', 'public.ss_profiles.is_verified', 'public.ss_profile_privacy.phone_number', 'public.ss_profile_privacy.address']::text[],
      array['public.ss_sync_profile_verification_status()']::text[],
      array['public.ss_learning_groups.ss_groups_select_public', 'public.ss_group_members.ss_group_members_insert_owner_or_self']::text[],
      array['public.ss_verification_requests.ss_sync_verification_trigger']::text[]
    ),
    (
      '20260925000006_realtime_and_webhooks.sql',
      array['public.ss_notifications']::text[],
      array['public.ss_notifications.user_id', 'public.ss_notifications.metadata']::text[],
      array['public.ss_on_escrow_created_notify()', 'public.ss_process_payment_webhook(uuid, numeric, text, text, text)']::text[],
      array['public.ss_notifications.ss_notifications_select_owner', 'public.ss_notifications.ss_notifications_update_owner']::text[],
      array['public.ss_escrow_transactions.ss_escrow_created_notify_trigger']::text[]
    ),
    (
      '20260926000000_profile_bdt_balance.sql',
      array[]::text[],
      array['public.ss_profiles.bdt_balance']::text[],
      array[]::text[],
      array[]::text[],
      array[]::text[]
    ),
    (
      '20260927000000_community_post_category.sql',
      array[]::text[],
      array['public.ss_social_posts.category']::text[],
      array[]::text[],
      array[]::text[],
      array[]::text[]
    ),
    (
      '20260927000001_profile_learning_skills.sql',
      array[]::text[],
      array['public.ss_profiles.learning_skills']::text[],
      array[]::text[],
      array[]::text[],
      array[]::text[]
    ),
    (
      '20260927000002_group_session_management.sql',
      array[]::text[],
      array['public.ss_group_sessions.description', 'public.ss_group_sessions.learning_outcomes', 'public.ss_group_sessions.category_id', 'public.ss_group_sessions.credit_cost', 'public.ss_group_sessions.max_students']::text[],
      array['public.ss_list_group_sessions()', 'public.ss_create_group_session(text, text, text, text, timestamptz, timestamptz, integer, integer)', 'public.ss_join_group_session(uuid, boolean)', 'public.ss_update_group_session(uuid, text, text, text, text, timestamptz, timestamptz, integer, integer)']::text[],
      array['public.ss_group_sessions.ss_group_sessions_select_member']::text[],
      array[]::text[]
    ),
    (
      '20260927000003_admin_manual_credit_deposits.sql',
      array['public.ss_wallet_transactions']::text[],
      array['public.ss_wallet_transactions.user_id', 'public.ss_wallet_transactions.amount_credits', 'public.ss_wallet_transactions.balance_after']::text[],
      array['public.ss_admin_list_wallet_users()', 'public.ss_admin_deposit_credits(uuid, integer, text)']::text[],
      array['public.ss_wallet_transactions.ss_wallet_transactions_select_owner_or_staff']::text[],
      array[]::text[]
    ),
    (
      '20261003000000_multiplayer_security_and_realtime.sql',
      array['public.ss_payment_webhook_receipts', 'public.ss_public_profiles']::text[],
      array['public.ss_payment_webhook_receipts.gateway', 'public.ss_payment_webhook_receipts.transaction_id', 'public.ss_public_profiles.show_skills']::text[],
      array['public.ss_submit_escrow_proof(uuid, text, text)']::text[],
      array['public.ss_profiles.ss_profiles_select_self']::text[],
      array[]::text[]
    ),
    (
      '20261003000001_enforce_public_skill_visibility.sql',
      array['public.ss_public_profiles']::text[],
      array['public.ss_public_profiles.skills', 'public.ss_public_profiles.show_skills']::text[],
      array[]::text[],
      array[]::text[],
      array[]::text[]
    ),
    (
      '20261003000002_profile_balance_rpc_fix.sql',
      array[]::text[],
      array[]::text[],
      array['public.ss_ss_protect_profile_system_fields()']::text[],
      array[]::text[],
      array['public.ss_profiles.ss_protect_profile_system_fields']::text[]
    ),
    (
      '20261003000003_multiplayer_messaging_and_escrow_fixes.sql',
      array[]::text[],
      array[]::text[],
      array['public.ss_create_conversation(uuid)', 'public.ss_create_escrow(uuid, uuid, integer, text)']::text[],
      array['public.ss_messages.ss_messages_select_member', 'public.ss_messages.ss_messages_insert_allowed']::text[],
      array[]::text[]
    ),
    (
      '20261003000004_harden_multiplayer_test_rpc.sql',
      array[]::text[],
      array[]::text[],
      array['public.ss_can_contact(uuid, uuid, text)']::text[],
      array['public.ss_messages.ss_messages_insert_allowed']::text[],
      array[]::text[]
    ),
    (
      '20261003000005_single_bdt_balance_and_escrow_settlement.sql',
      array[]::text[],
      array['public.ss_courses.price_bdt', 'public.ss_escrow_transactions.amount_bdt', 'public.ss_escrow_transactions.gross_amount_bdt', 'public.ss_escrow_transactions.platform_fee_bdt', 'public.ss_escrow_transactions.net_amount_bdt']::text[],
      array['public.ss_create_escrow(uuid, uuid, integer, text, numeric)', 'public.ss_release_escrow_by_payer(uuid)', 'public.ss_admin_deposit_bdt(uuid, numeric, text)', 'public.ss_set_bdt_balance_for_testing(uuid, numeric)']::text[],
      array[]::text[],
      array[]::text[]
    ),
    (
      '20261004000000_escrow_bdt_fee_constraint.sql',
      array['public.ss_escrow_transactions']::text[],
      array['public.ss_escrow_transactions.gross_amount_bdt', 'public.ss_escrow_transactions.platform_fee_bdt', 'public.ss_escrow_transactions.net_amount_bdt']::text[],
      array[]::text[],
      array[]::text[],
      array[]::text[]
    ),
    (
      '20261004000001_resolve_dispute_admin_notes.sql',
      array[]::text[],
      array[]::text[],
      array['public.ss_resolve_dispute(uuid, public.ss_dispute_resolution, text, text)']::text[],
      array[]::text[],
      array[]::text[]
    ),
    (
      '20261004000002_grant_ss_is_staff.sql',
      array[]::text[],
      array[]::text[],
      array['public.ss_is_staff()']::text[],
      array[]::text[],
      array[]::text[]
    ),
    (
      '20261007000000_service_fulfillment_delivery_and_meeting.sql',
      array[]::text[],
      array['public.ss_courses.delivery_mode', 'public.ss_escrow_transactions.meeting_details']::text[],
      array['public.ss_update_escrow_meeting_details(uuid, text)']::text[],
      array[]::text[],
      array[]::text[]
    ),
    (
      '20261104000000_booking_conversations_and_chat_hardening.sql',
      array[]::text[],
      array['public.ss_escrow_transactions.conversation_id']::text[],
      array[
        'public.ss_ensure_escrow_conversation(uuid, uuid)',
        'public.ss_link_escrow_conversation()',
        'public.ss_can_contact(uuid, uuid, text)',
        'public.ss_create_escrow(uuid, uuid, integer, text)',
        'public.ss_create_escrow(uuid, uuid, integer, text, numeric)',
        'public.ss_create_conversation(uuid)',
        'public.ss_is_conversation_member(uuid)',
        'public.ss_is_staff()',
        'public.ss_update_call_status(uuid, public.ss_call_status)',
        'public.ss_update_escrow_meeting_details(uuid, text)',
        'public.ss_submit_escrow_proof(uuid, text, text)',
        'public.ss_release_escrow_by_payer(uuid)',
        'public.ss_resolve_dispute(uuid, public.ss_dispute_resolution, text, text)',
        'public.ss_admin_list_wallet_users()',
        'public.ss_admin_deposit_bdt(uuid, numeric, text)',
        'public.ss_list_group_sessions()',
        'public.ss_create_group_session(text, text, text, text, timestamptz, timestamptz, integer, integer)',
        'public.ss_join_group_session(uuid, boolean)',
        'public.ss_update_group_session(uuid, text, text, text, text, timestamptz, timestamptz, integer, integer)',
        'public.ss_set_bdt_balance_for_testing(uuid, numeric)'
      ]::text[],
      array['public.ss_conversations.ss_conversations_select_member', 'public.ss_conversation_members.ss_conversation_members_select_member', 'public.ss_messages.ss_messages_select_member', 'public.ss_messages.ss_messages_insert_allowed']::text[],
      array['public.ss_escrow_transactions.ss_link_escrow_conversation']::text[]
    ),
    (
      '20261105000000_course_review_realtime.sql',
      array[]::text[],
      array[]::text[],
      array[]::text[],
      array[]::text[],
      array[]::text[]
    ),
    (
      '20261105030000_webrtc_call_signaling.sql',
      array[]::text[],
      array[
        'public.ss_call_sessions.offer',
        'public.ss_call_sessions.answer',
        'public.ss_call_sessions.caller_ice_candidates',
        'public.ss_call_sessions.callee_ice_candidates'
      ]::text[],
      array['public.ss_update_call_signaling(uuid, text, jsonb)']::text[],
      array[]::text[],
      array[]::text[]
    )
),
missing_objects as (
  select m.filename, 'table/view ' || object_name as object_name
  from migration_expectations m
  cross join lateral unnest(m.tables) as expected(object_name)
  where to_regclass(expected.object_name) is null

  union all

  select m.filename, 'column ' || expected.object_name
  from migration_expectations m
  cross join lateral unnest(m.columns) as expected(object_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = split_part(expected.object_name, '.', 1)
      and c.table_name = split_part(expected.object_name, '.', 2)
      and c.column_name = split_part(expected.object_name, '.', 3)
  )

  union all

  select m.filename, 'function ' || expected.signature
  from migration_expectations m
  cross join lateral unnest(m.functions) as expected(signature)
  where to_regprocedure(expected.signature) is null

  union all

  select m.filename, 'policy ' || expected.policy_name
  from migration_expectations m
  cross join lateral unnest(m.policies) as expected(policy_name)
  where not exists (
    select 1
    from pg_policies p
    where p.schemaname = split_part(expected.policy_name, '.', 1)
      and p.tablename = split_part(expected.policy_name, '.', 2)
      and p.policyname = split_part(expected.policy_name, '.', 3)
  )

  union all

  select m.filename, 'trigger ' || expected.trigger_name
  from migration_expectations m
  cross join lateral unnest(m.triggers) as expected(trigger_name)
  where not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = split_part(expected.trigger_name, '.', 1)
      and c.relname = split_part(expected.trigger_name, '.', 2)
      and t.tgname = split_part(expected.trigger_name, '.', 3)
      and not t.tgisinternal
  )

  union all

  select expected.filename, 'constraint ' || expected.schema_name || '.' || expected.table_name || '.' || expected.constraint_name
  from (values
    ('20261004000000_escrow_bdt_fee_constraint.sql', 'public', 'ss_escrow_transactions', 'ss_escrow_bdt_fee_math'),
    ('20261007000000_service_fulfillment_delivery_and_meeting.sql', 'public', 'ss_courses', 'ss_courses_delivery_mode_check')
  ) as expected(filename, schema_name, table_name, constraint_name)
  where not exists (
    select 1
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = expected.schema_name
      and r.relname = expected.table_name
      and c.conname = expected.constraint_name
  )

  union all

  select expected.filename, 'realtime publication table ' || expected.schema_name || '.' || expected.table_name
  from (values
    ('20260925000006_realtime_and_webhooks.sql', 'public', 'ss_messages'),
    ('20260925000006_realtime_and_webhooks.sql', 'public', 'ss_call_sessions'),
    ('20260925000006_realtime_and_webhooks.sql', 'public', 'ss_notifications'),
    ('20261003000000_multiplayer_security_and_realtime.sql', 'public', 'ss_profiles'),
    ('20261003000000_multiplayer_security_and_realtime.sql', 'public', 'ss_escrow_transactions'),
    ('20261104000000_booking_conversations_and_chat_hardening.sql', 'public', 'ss_messages'),
    ('20261105000000_course_review_realtime.sql', 'public', 'ss_course_reviews')
  ) as expected(filename, schema_name, table_name)
  where not exists (
    select 1
    from pg_publication_tables p
    where p.pubname = 'supabase_realtime'
      and p.schemaname = expected.schema_name
      and p.tablename = expected.table_name
  )
)
select
  m.filename,
  count(missing.object_name) = 0 as applied,
  coalesce(
    array_agg(missing.object_name order by missing.object_name)
      filter (where missing.object_name is not null),
    array[]::text[]
  ) as missing_objects
from migration_expectations m
left join missing_objects missing on missing.filename = m.filename
group by m.filename
order by m.filename;
