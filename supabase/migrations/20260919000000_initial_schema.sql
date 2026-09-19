-- Initial Schema Migration: WhatsApp Sales Hub Multi-Tenant Platform
-- Enforces Postgres Row Level Security (RLS) with strict tenant isolation

create extension if not exists "pgcrypto";

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_tier text not null default 'trial' check (plan_tier in ('trial', 'starter', 'growth', 'scale')),
  status text not null default 'onboarding' check (status in ('onboarding', 'active', 'suspended', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'agent' check (role in ('admin', 'agent')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table public.phone_number_index (
  phone_number_id text primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  waba_id text,
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  wa_phone text not null,
  name text,
  lead_score text not null default 'frio' check (lead_score in ('frio', 'morno', 'quente')),
  stage text not null default 'novo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, wa_phone)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_body text,
  message_type text not null default 'text',
  created_at timestamptz not null default now()
);

create table public.usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period text not null,
  meta_messages_free_window int not null default 0,
  meta_messages_paid int not null default 0,
  gemini_tokens_used bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, period)
);

create index idx_contacts_tenant on public.contacts(tenant_id);
create index idx_conversations_tenant on public.conversations(tenant_id);
create index idx_conversations_contact on public.conversations(contact_id);
create index idx_tenant_users_user on public.tenant_users(user_id);
create index idx_phone_number_index_tenant on public.phone_number_index(tenant_id);

alter table public.tenants enable row level security;
alter table public.tenant_users enable row level security;
alter table public.phone_number_index enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.usage enable row level security;

-- phone_number_index e usage: nenhuma policy para 'authenticated' de propósito —
-- só service_role (usado pelas Edge Functions) acessa, equivalente ao bloqueio
-- client-side que existia nas Firestore Rules originais.

create policy "tenant_users_can_read_own_tenant"
  on public.tenants for select to authenticated
  using (id in (select tenant_id from public.tenant_users where user_id = (select auth.uid())));

create policy "tenant_users_can_read_own_membership"
  on public.tenant_users for select to authenticated
  using (tenant_id in (select tenant_id from public.tenant_users where user_id = (select auth.uid())));

create policy "contacts_isolated_by_tenant_select"
  on public.contacts for select to authenticated
  using (tenant_id in (select tenant_id from public.tenant_users where user_id = (select auth.uid())));

create policy "contacts_isolated_by_tenant_insert"
  on public.contacts for insert to authenticated
  with check (tenant_id in (select tenant_id from public.tenant_users where user_id = (select auth.uid())));

create policy "contacts_isolated_by_tenant_update"
  on public.contacts for update to authenticated
  using (tenant_id in (select tenant_id from public.tenant_users where user_id = (select auth.uid())))
  with check (tenant_id in (select tenant_id from public.tenant_users where user_id = (select auth.uid())));

create policy "conversations_isolated_by_tenant_select"
  on public.conversations for select to authenticated
  using (tenant_id in (select tenant_id from public.tenant_users where user_id = (select auth.uid())));

create policy "conversations_isolated_by_tenant_insert"
  on public.conversations for insert to authenticated
  with check (tenant_id in (select tenant_id from public.tenant_users where user_id = (select auth.uid())));
