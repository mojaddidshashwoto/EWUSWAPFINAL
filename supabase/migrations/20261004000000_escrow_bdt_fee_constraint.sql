-- BDT is the source of truth; independently rounded legacy credit mirrors do not conserve exactly.
alter table public.ss_escrow_transactions
  drop constraint if exists escrow_fee_math,
  drop constraint if exists ss_escrow_fee_math;

alter table public.ss_escrow_transactions
  add constraint ss_escrow_bdt_fee_math check (
    platform_fee_credits >= 0
    and net_amount_credits >= 0
    and gross_amount_credits = amount_credits
    and (
      amount_bdt is null
      or (
        gross_amount_bdt is not distinct from amount_bdt
        and platform_fee_bdt is not null
        and net_amount_bdt is not null
        and platform_fee_bdt + net_amount_bdt = gross_amount_bdt
      )
    )
  ) not valid;
