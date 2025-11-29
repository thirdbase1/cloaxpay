-- Create merchants table (links to Supabase auth users)
create table if not exists public.merchants (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null,
  email text not null,
  webhook_url text,
  webhook_secret text,
  test_mode boolean default true,
  accept_any_chain boolean default false,
  auto_gas_coverage boolean default false,
  preferred_token text default 'USDC',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create API keys table
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  key_type text not null check (key_type in ('public', 'secret')),
  key_value text not null unique,
  is_live boolean default false,
  created_at timestamptz default now(),
  revoked_at timestamptz,
  constraint valid_key_format check (
    (key_type = 'public' and key_value like 'pk_%') or
    (key_type = 'secret' and key_value like 'sk_%')
  )
);

-- Create payment sessions table
create table if not exists public.payment_sessions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  session_id text not null unique,
  amount numeric(20, 8) not null,
  currency text not null,
  deposit_address text,
  deposit_chain text,
  status text not null default 'pending' check (status in ('pending', 'awaiting_payment', 'paid', 'processing', 'completed', 'failed', 'expired')),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz
);

-- Create transactions table
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.payment_sessions(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  tx_hash text not null,
  from_chain text not null,
  from_token text not null,
  from_amount numeric(20, 8) not null,
  to_chain text,
  to_token text,
  to_amount numeric(20, 8),
  platform_fee numeric(20, 8) default 0,
  gas_fee numeric(20, 8) default 0,
  net_amount numeric(20, 8),
  status text not null default 'detected' check (status in ('detected', 'confirming', 'confirmed', 'swapping', 'swapped', 'settling', 'settled', 'unresolved')),
  swap_route jsonb,
  device_info jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  confirmed_at timestamptz,
  settled_at timestamptz
);

-- Create unresolved transactions pool
create table if not exists public.unresolved_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  reason text not null,
  resolved boolean default false,
  resolution_notes text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- Create batch payouts table
create table if not exists public.batch_payouts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  batch_number text not null unique,
  total_amount numeric(20, 8) not null,
  token text not null,
  destination_wallet text not null,
  destination_chain text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  tx_hash text,
  transaction_ids uuid[] not null,
  created_at timestamptz default now(),
  executed_at timestamptz
);

-- Enable Row Level Security
alter table public.merchants enable row level security;
alter table public.api_keys enable row level security;
alter table public.payment_sessions enable row level security;
alter table public.transactions enable row level security;
alter table public.unresolved_transactions enable row level security;
alter table public.batch_payouts enable row level security;

-- RLS policies for merchants
drop policy if exists "Merchants can view their own profile" on public.merchants;
create policy "Merchants can view their own profile"
  on public.merchants for select
  using (auth.uid() = id);

drop policy if exists "Merchants can update their own profile" on public.merchants;
create policy "Merchants can update their own profile"
  on public.merchants for update
  using (auth.uid() = id);

-- RLS policies for API keys
drop policy if exists "Merchants can view their own API keys" on public.api_keys;
create policy "Merchants can view their own API keys"
  on public.api_keys for select
  using (merchant_id = auth.uid());

drop policy if exists "Merchants can create their own API keys" on public.api_keys;
create policy "Merchants can create their own API keys"
  on public.api_keys for insert
  with check (merchant_id = auth.uid());

drop policy if exists "Merchants can delete their own API keys" on public.api_keys;
create policy "Merchants can delete their own API keys"
  on public.api_keys for delete
  using (merchant_id = auth.uid());

-- RLS policies for payment sessions
drop policy if exists "Merchants can view their own sessions" on public.payment_sessions;
create policy "Merchants can view their own sessions"
  on public.payment_sessions for select
  using (merchant_id = auth.uid());

drop policy if exists "Merchants can create their own sessions" on public.payment_sessions;
create policy "Merchants can create their own sessions"
  on public.payment_sessions for insert
  with check (merchant_id = auth.uid());

-- RLS policies for transactions
drop policy if exists "Merchants can view their own transactions" on public.transactions;
create policy "Merchants can view their own transactions"
  on public.transactions for select
  using (merchant_id = auth.uid());

-- RLS policies for unresolved transactions
drop policy if exists "Merchants can view their own unresolved transactions" on public.unresolved_transactions;
create policy "Merchants can view their own unresolved transactions"
  on public.unresolved_transactions for select
  using (merchant_id = auth.uid());

-- RLS policies for batch payouts
drop policy if exists "Merchants can view their own batch payouts" on public.batch_payouts;
create policy "Merchants can view their own batch payouts"
  on public.batch_payouts for select
  using (merchant_id = auth.uid());

-- Create indexes for performance
create index if not exists idx_api_keys_merchant on public.api_keys(merchant_id);
create index if not exists idx_api_keys_value on public.api_keys(key_value) where revoked_at is null;
create index if not exists idx_sessions_merchant on public.payment_sessions(merchant_id);
create index if not exists idx_sessions_status on public.payment_sessions(status);
create index if not exists idx_transactions_session on public.transactions(session_id);
create index if not exists idx_transactions_merchant on public.transactions(merchant_id);
create index if not exists idx_transactions_status on public.transactions(status);
create index if not exists idx_unresolved_merchant on public.unresolved_transactions(merchant_id);
create index if not exists idx_unresolved_resolved on public.unresolved_transactions(resolved);
create index if not exists idx_batch_merchant on public.batch_payouts(merchant_id);

-- Create merchant_profiles view for compatibility
create or replace view public.merchant_profiles as
select * from public.merchants;

-- Grant permissions on the view
grant select on public.merchant_profiles to authenticated;
