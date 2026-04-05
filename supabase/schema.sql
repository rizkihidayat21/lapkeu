create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type public.transaction_type as enum ('income', 'expense', 'asset');
  end if;

  if not exists (select 1 from pg_type where typname = 'funding_source') then
    create type public.funding_source as enum ('cash', 'equity', 'debt');
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

create index if not exists financial_transactions_user_date_idx
  on public.financial_transactions (user_id, transaction_date desc);

create index if not exists financial_transactions_user_type_idx
  on public.financial_transactions (user_id, transaction_type);

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.financial_transactions enable row level security;

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

revoke all on public.profiles from anon;
revoke all on public.financial_transactions from anon;
