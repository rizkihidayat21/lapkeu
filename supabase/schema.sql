create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type public.transaction_type as enum ('income', 'expense', 'asset');
  end if;

  if not exists (select 1 from pg_type where typname = 'funding_source') then
    create type public.funding_source as enum ('cash', 'equity', 'debt');
  end if;

  if not exists (select 1 from pg_type where typname = 'account_class') then
    create type public.account_class as enum ('asset', 'liability', 'equity', 'revenue', 'expense');
  end if;

  if not exists (select 1 from pg_type where typname = 'journal_source') then
    create type public.journal_source as enum ('income', 'expense', 'asset', 'opening_balance', 'manual');
  end if;

  if not exists (select 1 from pg_type where typname = 'journal_line_type') then
    create type public.journal_line_type as enum ('debit', 'credit');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  company_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_email_format check (position('@' in email) > 1),
  constraint profiles_display_name_len check (
    display_name is null or char_length(btrim(display_name)) between 3 and 80
  ),
  constraint profiles_company_name_len check (
    company_name is null or char_length(btrim(company_name)) between 3 and 120
  )
);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  transaction_type public.transaction_type not null,
  category text not null,
  description text not null,
  amount numeric(14, 2) not null,
  transaction_date date not null,
  asset_name text,
  funding_source public.funding_source,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint financial_transactions_amount_positive check (amount > 0),
  constraint financial_transactions_description_len check (
    char_length(btrim(description)) between 3 and 160
  ),
  constraint financial_transactions_category_len check (
    char_length(btrim(category)) between 2 and 40
  ),
  constraint financial_transactions_asset_name_len check (
    asset_name is null or char_length(btrim(asset_name)) between 3 and 160
  ),
  constraint financial_transactions_asset_shape check (
    (
      transaction_type = 'asset'
      and asset_name is not null
      and funding_source is not null
    )
    or (
      transaction_type in ('income', 'expense')
      and asset_name is null
      and funding_source is null
    )
  ),
  constraint financial_transactions_cash_asset_funding check (
    not (transaction_type = 'asset' and category = 'cash' and funding_source = 'cash')
  )
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  name text not null,
  account_class public.account_class not null,
  account_category text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint accounts_code_len check (char_length(btrim(code)) between 3 and 20),
  constraint accounts_name_len check (char_length(btrim(name)) between 3 and 100),
  constraint accounts_category_len check (char_length(btrim(account_category)) between 3 and 40),
  constraint accounts_unique_code unique (user_id, code),
  constraint accounts_unique_name unique (user_id, name)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  description text not null,
  source public.journal_source not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint journal_entries_description_len check (char_length(btrim(description)) between 3 and 160)
);

create table if not exists public.journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete restrict,
  line_type public.journal_line_type not null,
  amount numeric(14, 2) not null,
  memo text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint journal_entry_lines_amount_positive check (amount > 0),
  constraint journal_entry_lines_memo_len check (
    memo is null or char_length(btrim(memo)) <= 160
  )
);

create index if not exists financial_transactions_user_date_idx
  on public.financial_transactions (user_id, transaction_date desc);

create index if not exists financial_transactions_user_type_idx
  on public.financial_transactions (user_id, transaction_type);

create index if not exists accounts_user_class_idx
  on public.accounts (user_id, account_class);

create index if not exists journal_entries_user_date_idx
  on public.journal_entries (user_id, entry_date desc);

create index if not exists journal_entry_lines_entry_idx
  on public.journal_entry_lines (journal_entry_id);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_financial_transactions_updated_at on public.financial_transactions;
create trigger set_financial_transactions_updated_at
before update on public.financial_transactions
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_accounts_updated_at on public.accounts;
create trigger set_accounts_updated_at
before update on public.accounts
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_journal_entries_updated_at on public.journal_entries;
create trigger set_journal_entries_updated_at
before update on public.journal_entries
for each row
execute function public.set_current_timestamp_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, company_name)
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'company_name', '')), '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    company_name = coalesce(excluded.company_name, public.profiles.company_name);

  return new;
end;
$$;

create or replace function public.ensure_default_accounts()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.accounts (user_id, code, name, account_class, account_category)
  values
    (v_user_id, '1010', 'Kas', 'asset', 'cash'),
    (v_user_id, '1110', 'Piutang Usaha', 'asset', 'receivable'),
    (v_user_id, '1510', 'Peralatan', 'asset', 'fixed_asset'),
    (v_user_id, '1520', 'Kendaraan', 'asset', 'fixed_asset'),
    (v_user_id, '1530', 'Persediaan', 'asset', 'inventory'),
    (v_user_id, '2010', 'Utang Usaha', 'liability', 'payable'),
    (v_user_id, '2110', 'Utang Bank', 'liability', 'debt'),
    (v_user_id, '3010', 'Modal Pemilik', 'equity', 'owner_equity'),
    (v_user_id, '3020', 'Laba Ditahan', 'equity', 'retained_earnings'),
    (v_user_id, '4010', 'Pendapatan Jasa', 'revenue', 'operating_revenue'),
    (v_user_id, '5010', 'Beban Gaji', 'expense', 'operating_expense'),
    (v_user_id, '5020', 'Beban Sewa', 'expense', 'operating_expense'),
    (v_user_id, '5030', 'Beban Utilitas', 'expense', 'operating_expense'),
    (v_user_id, '5040', 'Beban Transportasi', 'expense', 'operating_expense'),
    (v_user_id, '5050', 'Beban Perlengkapan', 'expense', 'operating_expense'),
    (v_user_id, '5060', 'Beban Pemasaran', 'expense', 'operating_expense'),
    (v_user_id, '5099', 'Beban Lain-lain', 'expense', 'operating_expense')
  on conflict (user_id, code) do nothing;
end;
$$;

create or replace function public.create_balanced_journal_entry(
  p_entry_date date,
  p_description text,
  p_source public.journal_source,
  p_lines jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry_id uuid;
  v_line jsonb;
  v_debit numeric(14,2) := 0;
  v_credit numeric(14,2) := 0;
  v_account_id uuid;
  v_line_type public.journal_line_type;
  v_amount numeric(14,2);
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_entry_date is null then
    raise exception 'Entry date is required';
  end if;

  if p_description is null or char_length(btrim(p_description)) < 3 then
    raise exception 'Description is required';
  end if;

  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 2 then
    raise exception 'At least two journal lines are required';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_account_id := (v_line ->> 'account_id')::uuid;
    v_line_type := (v_line ->> 'line_type')::public.journal_line_type;
    v_amount := (v_line ->> 'amount')::numeric(14,2);

    if v_account_id is null or v_line_type is null or v_amount is null or v_amount <= 0 then
      raise exception 'Invalid journal line payload';
    end if;

    if not exists (
      select 1
      from public.accounts a
      where a.id = v_account_id
        and a.user_id = v_user_id
        and a.is_active = true
    ) then
      raise exception 'Account not found or inactive';
    end if;

    if v_line_type = 'debit' then
      v_debit := v_debit + v_amount;
    else
      v_credit := v_credit + v_amount;
    end if;
  end loop;

  if v_debit <> v_credit then
    raise exception 'Journal entry is not balanced';
  end if;

  insert into public.journal_entries (user_id, entry_date, description, source)
  values (v_user_id, p_entry_date, btrim(p_description), p_source)
  returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    insert into public.journal_entry_lines (journal_entry_id, account_id, line_type, amount, memo)
    values (
      v_entry_id,
      (v_line ->> 'account_id')::uuid,
      (v_line ->> 'line_type')::public.journal_line_type,
      (v_line ->> 'amount')::numeric(14,2),
      nullif(btrim(coalesce(v_line ->> 'memo', '')), '')
    );
  end loop;

  return v_entry_id;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_entry_lines enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Transactions are viewable by owner" on public.financial_transactions;
create policy "Transactions are viewable by owner"
on public.financial_transactions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Transactions are insertable by owner" on public.financial_transactions;
create policy "Transactions are insertable by owner"
on public.financial_transactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Transactions are updatable by owner" on public.financial_transactions;
create policy "Transactions are updatable by owner"
on public.financial_transactions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Transactions are deletable by owner" on public.financial_transactions;
create policy "Transactions are deletable by owner"
on public.financial_transactions
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Accounts are viewable by owner" on public.accounts;
create policy "Accounts are viewable by owner"
on public.accounts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Accounts are insertable by owner" on public.accounts;
create policy "Accounts are insertable by owner"
on public.accounts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Accounts are updatable by owner" on public.accounts;
create policy "Accounts are updatable by owner"
on public.accounts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Journal entries are viewable by owner" on public.journal_entries;
create policy "Journal entries are viewable by owner"
on public.journal_entries
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Journal entries are insertable by owner" on public.journal_entries;
create policy "Journal entries are insertable by owner"
on public.journal_entries
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Journal entries are deletable by owner" on public.journal_entries;
create policy "Journal entries are deletable by owner"
on public.journal_entries
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Journal lines are viewable by owner" on public.journal_entry_lines;
create policy "Journal lines are viewable by owner"
on public.journal_entry_lines
for select
to authenticated
using (
  exists (
    select 1
    from public.journal_entries je
    where je.id = journal_entry_id
      and je.user_id = auth.uid()
  )
);

drop policy if exists "Journal lines are insertable by owner" on public.journal_entry_lines;
create policy "Journal lines are insertable by owner"
on public.journal_entry_lines
for insert
to authenticated
with check (
  exists (
    select 1
    from public.journal_entries je
    where je.id = journal_entry_id
      and je.user_id = auth.uid()
  )
);

drop policy if exists "Journal lines are updatable by owner" on public.journal_entry_lines;
create policy "Journal lines are updatable by owner"
on public.journal_entry_lines
for update
to authenticated
using (
  exists (
    select 1
    from public.journal_entries je
    where je.id = journal_entry_id
      and je.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.journal_entries je
    where je.id = journal_entry_id
      and je.user_id = auth.uid()
  )
);

drop policy if exists "Journal lines are deletable by owner" on public.journal_entry_lines;
create policy "Journal lines are deletable by owner"
on public.journal_entry_lines
for delete
to authenticated
using (
  exists (
    select 1
    from public.journal_entries je
    where je.id = journal_entry_id
      and je.user_id = auth.uid()
  )
);

revoke all on public.profiles from anon;
revoke all on public.financial_transactions from anon;
revoke all on public.accounts from anon;
revoke all on public.journal_entries from anon;
revoke all on public.journal_entry_lines from anon;

