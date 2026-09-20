-- Admin Console foundation: platform-level admin identity, real bot config
-- persistence (previously 100% cosmetic — see DECISIONS.md ADR-018), and a
-- status change history for tenants.

-- ---------------------------------------------------------------------------
-- 1. platform_admins: identity of a "Fluxi admin" (operates the whole
--    platform), distinct from tenant_users.role='admin' (admin of a single
--    tenant only). RLS lets a user read their own row so the client can
--    check "am I a platform admin" for UI purposes — real authorization
--    happens server-side in the admin-console Edge Function, which uses
--    service_role and never trusts this table from client input.
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create policy "platform_admins_can_read_own_row"
  on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. bot_configs: one row per tenant, mirroring _shared/stateMachine.ts's
--    BotConfigData shape so the webhook can load it directly with no mapping
--    beyond column names. Tenant admins read/write their own row via RLS
--    (same direct-write pattern already used for contacts/conversations in
--    this app); the platform admin console writes any tenant's row via
--    service_role in the admin-console Edge Function instead of RLS.
-- ---------------------------------------------------------------------------
create table public.bot_configs (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  bot_name text not null default 'Alex - Especialista em Vendas',
  tone text not null default 'consultative' check (tone in ('consultative', 'professional', 'friendly', 'enthusiastic')),
  company_description text not null default '',
  sales_pitch text not null default '',
  knowledge_base text[] not null default '{}',
  business_hours_enabled boolean not null default false,
  business_hours_start text not null default '08:00',
  business_hours_end text not null default '18:00',
  outside_hours_message text not null default '',
  escalation_keywords text[] not null default '{}',
  escalation_message text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.bot_configs enable row level security;

create policy "tenant_users_can_read_own_bot_config"
  on public.bot_configs for select to authenticated
  using (tenant_id in (select tenant_id from public.tenant_users where user_id = (select auth.uid())));

create policy "tenant_admin_can_upsert_own_bot_config"
  on public.bot_configs for insert to authenticated
  with check (
    tenant_id in (
      select tenant_id from public.tenant_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

create policy "tenant_admin_can_update_own_bot_config"
  on public.bot_configs for update to authenticated
  using (
    tenant_id in (
      select tenant_id from public.tenant_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  )
  with check (
    tenant_id in (
      select tenant_id from public.tenant_users
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. tenant_status_history: audit trail for the admin console's "pause /
--    cancel / reactivate" actions and future automatic suspension by
--    non-payment (ADR-017, item 6). No client policies — only the
--    admin-console Edge Function (service_role) reads/writes this.
-- ---------------------------------------------------------------------------
create table public.tenant_status_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.tenant_status_history enable row level security;

create index idx_tenant_status_history_tenant on public.tenant_status_history(tenant_id);
create index idx_bot_configs_tenant on public.bot_configs(tenant_id);
