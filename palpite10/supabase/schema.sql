-- =====================================================================
--  PALPITE10 — database schema
--  Supabase → SQL Editor → paste this whole file → Run.
--  Safe to run again: it never drops data.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
--  LEADS — one row per person
-- ---------------------------------------------------------------------
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  start_token text not null unique,
  visitor_id text,
  telegram_user_id text,
  chat_id text,
  first_name text,
  username text,
  language_code text,

  source text,
  medium text,
  campaign text,
  adset text,
  ad text,
  fbclid text,
  meta_fbc text,
  meta_fbp text,
  client_ip text,
  user_agent text,
  landing_url text,

  stage text not null default 'NEW',
  score integer not null default 0,
  playbook_version integer,

  user_turns integer not null default 0,
  pre_free_turns integer not null default 0,
  post_free_turns integer not null default 0,
  eligible_turns integer not null default 0,

  free_channel_invited boolean not null default false,
  free_channel_invited_at timestamptz,
  free_channel_joined boolean not null default false,
  free_channel_joined_at timestamptz,

  vip_offer_count integer not null default 0,
  vip_offer_last_at timestamptz,
  plans_shown_count integer not null default 0,

  checkout_started boolean not null default false,
  checkout_started_at timestamptz,
  last_checkout_plan text,

  paid boolean not null default false,
  paid_at timestamptz,
  first_paid_plan text,
  total_revenue numeric(12,2) not null default 0,
  currency text,
  vip_active boolean not null default false,
  vip_access_sent boolean not null default false,
  whop_membership_id text,
  whop_user_id text,
  refunded boolean not null default false,

  opted_out boolean not null default false,
  do_not_sell boolean not null default false,
  do_not_sell_reason text,
  blocked boolean not null default false,
  needs_human boolean not null default false,

  followup_count integer not null default 0,
  followups_since_reply integer not null default 0,
  followups_sent jsonb not null default '[]'::jsonb,
  last_followup_at timestamptz,

  last_user_message_at timestamptz,
  last_bot_message_at timestamptz,

  outcome text check (outcome in ('won', 'lost')),
  outcome_reason text,
  closed_at timestamptz,
  analyzed_at timestamptz,

  lock_until timestamptz,
  merged_into uuid references leads (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists leads_telegram_user_uidx on leads (telegram_user_id) where telegram_user_id is not null and merged_into is null;
create index if not exists leads_visitor_idx on leads (visitor_id, created_at desc) where visitor_id is not null;
create index if not exists leads_membership_idx on leads (whop_membership_id) where whop_membership_id is not null;
create index if not exists leads_followup_idx on leads (updated_at) where paid = false and chat_id is not null;
create index if not exists leads_learning_idx on leads (closed_at) where outcome is not null and analyzed_at is null;
create index if not exists leads_checkout_idx on leads (checkout_started_at desc) where checkout_started = true and paid = false;
create index if not exists leads_created_idx on leads (created_at desc);

create table if not exists lead_profiles (
  lead_id uuid primary key references leads (id) on delete cascade,
  favorite_team text,
  leagues jsonb not null default '[]'::jsonb,
  prediction_usage text,
  wants jsonb not null default '[]'::jsonb,
  pain_points jsonb not null default '[]'::jsonb,
  objections jsonb not null default '[]'::jsonb,
  style text,
  notes text,
  segment text,
  updated_at timestamptz not null default now()
);

create table if not exists lead_signals (
  lead_id uuid not null references leads (id) on delete cascade,
  key text not null,
  value numeric(3,2) not null default 0,
  evidence text,
  source text not null default 'ai',
  updated_at timestamptz not null default now(),
  primary key (lead_id, key)
);

-- ---------------------------------------------------------------------
--  CONVERSATION
-- ---------------------------------------------------------------------
create table if not exists messages (
  id bigint generated always as identity primary key,
  lead_id uuid not null references leads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'event')),
  content text not null,
  telegram_message_id bigint,
  created_at timestamptz not null default now()
);
create index if not exists messages_lead_idx on messages (lead_id, id);
-- A Telegram retry can never store the same customer message twice.
create unique index if not exists messages_telegram_uidx on messages (lead_id, telegram_message_id) where telegram_message_id is not null;

create table if not exists sales_events (
  id bigint generated always as identity primary key,
  lead_id uuid references leads (id) on delete cascade,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sales_events_name_idx on sales_events (name, created_at desc);
create index if not exists sales_events_lead_idx on sales_events (lead_id, created_at desc);

-- ---------------------------------------------------------------------
--  MONEY
-- ---------------------------------------------------------------------
create table if not exists checkouts (
  id bigint generated always as identity primary key,
  lead_id uuid not null references leads (id) on delete cascade,
  plan text not null,
  whop_checkout_id text,
  purchase_url text not null,
  via text not null default 'api',          -- 'api' (carries lead metadata) | 'static' (plain link)
  created_at timestamptz not null default now()
);
create index if not exists checkouts_lead_idx on checkouts (lead_id, plan, created_at desc);

create table if not exists payments (
  id bigint generated always as identity primary key,
  whop_payment_id text not null unique,
  lead_id uuid references leads (id) on delete set null,
  whop_membership_id text,
  whop_plan_id text,
  plan_key text,
  amount numeric(12,2) not null default 0,
  currency text,
  billing_reason text,
  is_first boolean not null default false,
  matched_by text,                           -- 'metadata' | 'membership' | 'recent_checkout' | 'admin' | null = unlinked
  email text,
  status text not null default 'paid',       -- 'paid' | 'refunded'
  raw jsonb,
  created_at timestamptz not null default now(),
  refunded_at timestamptz
);
create index if not exists payments_lead_idx on payments (lead_id);

create table if not exists webhook_events (
  id text primary key,                       -- the "webhook-id" header
  type text,
  status text not null default 'received',   -- received | processed | failed
  error text,
  payload jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists telegram_updates (
  update_id bigint primary key,
  status text not null default 'processing', -- processing | done | failed
  reply_sent boolean not null default false,
  attempts integer not null default 1,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  LEARNING
-- ---------------------------------------------------------------------
create table if not exists learning_batches (
  id bigint generated always as identity primary key,
  sample_size integer not null default 0,
  won_count integer not null default 0,
  conversion_rate numeric(6,4) not null default 0,
  playbook_version_before integer,
  playbook_version_after integer,
  summary text,
  biggest_leak text,
  changes jsonb not null default '[]'::jsonb,
  raw_output jsonb,
  result text,                               -- proposed | active | unchanged | rejected
  problems jsonb,
  created_at timestamptz not null default now()
);

create table if not exists conversation_analyses (
  lead_id uuid primary key references leads (id) on delete cascade,
  outcome text not null,
  loss_reason text,
  drop_stage text,
  segment text,
  objections jsonb not null default '[]'::jsonb,
  buying_signals jsonb not null default '[]'::jsonb,
  missed_signals jsonb not null default '[]'::jsonb,
  agent_mistakes jsonb not null default '[]'::jsonb,
  what_worked jsonb not null default '[]'::jsonb,
  quality_detail jsonb,
  conversation_quality integer,
  summary text,
  user_messages integer not null default 0,
  playbook_version integer,
  batch_id bigint references learning_batches (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists analyses_pending_idx on conversation_analyses (created_at) where batch_id is null;

create table if not exists playbooks (
  id bigint generated always as identity primary key,
  version integer not null unique,
  status text not null check (status in ('proposed', 'active', 'retired', 'rejected')),
  content jsonb not null,
  summary text,
  created_by text not null default 'coach',
  based_on_batch bigint references learning_batches (id) on delete set null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  retired_at timestamptz
);
-- Version 1 is the hand-written playbook in src/learning/playbook.ts (used while this table has no active row).

create table if not exists experiments (
  id bigint generated always as identity primary key,
  slot text not null,
  name text not null,
  hypothesis text,
  metric text not null default 'purchase',
  variants jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'running', 'won', 'inconclusive', 'stopped')),
  min_sample integer not null default 50,
  max_sample integer not null default 400,
  winner text,
  p_value numeric,
  results jsonb,
  created_by text not null default 'admin',
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create table if not exists experiment_assignments (
  experiment_id bigint not null references experiments (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  variant text not null check (variant in ('A', 'B')),
  exposed boolean not null default false,
  exposed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (experiment_id, lead_id)
);
create index if not exists assignments_lead_idx on experiment_assignments (lead_id);

-- ---------------------------------------------------------------------
--  INFRA
-- ---------------------------------------------------------------------
create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

create table if not exists app_state (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  FUNCTIONS
-- ---------------------------------------------------------------------

-- Two quick messages from the same person must not be answered in parallel.
create or replace function acquire_lead_lock(p_lead_id uuid, p_seconds integer)
returns boolean language plpgsql as $$
declare got uuid;
begin
  update leads
     set lock_until = now() + make_interval(secs => p_seconds)
   where id = p_lead_id and (lock_until is null or lock_until < now())
  returning id into got;
  return got is not null;
end $$;

-- Fixed-window rate limiter. true = allowed.
create or replace function check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql as $$
declare current_count integer;
begin
  insert into rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
     set count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
         window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into current_count;

  if random() < 0.02 then
    delete from rate_limits where window_start < now() - interval '1 day';
    delete from telegram_updates where created_at < now() - interval '14 days';
  end if;
  return current_count <= p_limit;
end $$;

-- Funnel of the leads CREATED since p_since (null = all time).
create or replace function funnel_stats(p_since timestamptz default null)
returns json language sql stable as $$
  select json_build_object(
    'landing_leads',  count(*) filter (where landing_url is not null or visitor_id is not null),
    'started_bot',    count(*) filter (where telegram_user_id is not null),
    'replied',        count(*) filter (where user_turns > 0),
    'invited_free',   count(*) filter (where free_channel_invited),
    'joined_free',    count(*) filter (where free_channel_joined),
    'offered_vip',    count(*) filter (where vip_offer_count > 0),
    'saw_plans',      count(*) filter (where plans_shown_count > 0),
    'checkout',       count(*) filter (where checkout_started),
    'paid',           count(*) filter (where paid),
    'revenue',        coalesce(sum(total_revenue), 0),
    'not_interested', count(*) filter (where stage = 'NOT_INTERESTED'),
    'opted_out',      count(*) filter (where opted_out),
    'blocked',        count(*) filter (where blocked),
    'do_not_sell',    count(*) filter (where do_not_sell)
  )
  from leads
  where merged_into is null and (p_since is null or created_at >= p_since);
$$;

create or replace function campaign_stats(p_since timestamptz default null)
returns json language sql stable as $$
  select coalesce(json_agg(t), '[]'::json) from (
    select campaign, ad,
           count(*) as leads,
           count(*) filter (where telegram_user_id is not null) as started,
           count(*) filter (where free_channel_joined) as joined_free,
           count(*) filter (where checkout_started) as checkout,
           count(*) filter (where paid) as paid,
           coalesce(sum(total_revenue), 0) as revenue
      from leads
     where merged_into is null and (p_since is null or created_at >= p_since)
     group by campaign, ad
     order by count(*) desc
     limit 25
  ) t;
$$;

create or replace function objection_stats(p_since timestamptz default null)
returns json language sql stable as $$
  select coalesce(json_agg(t), '[]'::json) from (
    select e.data ->> 'type' as type,
           count(*) as mentions,
           count(distinct e.lead_id) as leads,
           count(distinct e.lead_id) filter (where l.paid) as paid_leads
      from sales_events e
      join leads l on l.id = e.lead_id
     where e.name = 'OBJECTION' and (p_since is null or e.created_at >= p_since)
     group by 1
     order by count(distinct e.lead_id) desc
  ) t;
$$;

create or replace function playbook_stats()
returns json language sql stable as $$
  select coalesce(json_agg(t), '[]'::json) from (
    select playbook_version,
           count(*) as leads,
           count(*) filter (where user_turns > 0) as replied,
           count(*) filter (where free_channel_joined) as joined_free,
           count(*) filter (where plans_shown_count > 0) as saw_plans,
           count(*) filter (where checkout_started) as checkout,
           count(*) filter (where paid) as paid,
           round(count(*) filter (where paid)::numeric / greatest(count(*), 1), 4) as paid_rate
      from leads
     where merged_into is null and playbook_version is not null
     group by playbook_version
     order by playbook_version
  ) t;
$$;

-- ---------------------------------------------------------------------
--  SECURITY — the app uses the SECRET (service role) key on the server only.
--  RLS is ON with no policies, so the public/anon key can read nothing.
-- ---------------------------------------------------------------------
alter table leads enable row level security;
alter table lead_profiles enable row level security;
alter table lead_signals enable row level security;
alter table messages enable row level security;
alter table sales_events enable row level security;
alter table checkouts enable row level security;
alter table payments enable row level security;
alter table webhook_events enable row level security;
alter table telegram_updates enable row level security;
alter table learning_batches enable row level security;
alter table conversation_analyses enable row level security;
alter table playbooks enable row level security;
alter table experiments enable row level security;
alter table experiment_assignments enable row level security;
alter table rate_limits enable row level security;
alter table app_state enable row level security;

revoke execute on function acquire_lead_lock(uuid, integer) from public, anon, authenticated;
revoke execute on function check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function funnel_stats(timestamptz) from public, anon, authenticated;
revoke execute on function campaign_stats(timestamptz) from public, anon, authenticated;
revoke execute on function objection_stats(timestamptz) from public, anon, authenticated;
revoke execute on function playbook_stats() from public, anon, authenticated;
grant execute on function acquire_lead_lock(uuid, integer) to service_role;
grant execute on function check_rate_limit(text, integer, integer) to service_role;
grant execute on function funnel_stats(timestamptz) to service_role;
grant execute on function campaign_stats(timestamptz) to service_role;
grant execute on function objection_stats(timestamptz) to service_role;
grant execute on function playbook_stats() to service_role;

-- ---------------------------------------------------------------------
--  SEED — two starting A/B tests (only when the table is empty).
--  Only NEW leads are enrolled. A winner needs 50 people per variant
--  AND statistical significance; see /experiments in the admin chat.
-- ---------------------------------------------------------------------
insert into experiments (slot, name, hypothesis, metric, variants, status, created_by, started_at)
select * from (values
  (
    'opening',
    'Abertura: time do coração vs jogo da rodada',
    'Asking about the favourite team gets more replies than asking about this week''s games.',
    'reply',
    '[{"key":"A","instruction":"Na primeira mensagem, pergunte para qual time a pessoa torce."},{"key":"B","instruction":"Na primeira mensagem, pergunte qual jogo desta semana a pessoa mais quer acompanhar."}]'::jsonb,
    'running', 'admin', now()
  ),
  (
    'vip_transition',
    'Ponte para o VIP: direta vs pedindo permissão',
    'Asking permission before explaining the VIP leads to more checkouts than explaining it right away.',
    'checkout',
    '[{"key":"A","instruction":"Ao fazer a ponte para o VIP, ligue em uma frase o que a pessoa disse que procura com a seleção completa do VIP e já apresente o essencial."},{"key":"B","instruction":"Ao fazer a ponte para o VIP, primeiro pergunte se a pessoa quer que você explique como funciona o VIP; só detalhe depois do sim."}]'::jsonb,
    'running', 'admin', now()
  )
) as seed (slot, name, hypothesis, metric, variants, status, created_by, started_at)
where not exists (select 1 from experiments);

-- ---------------------------------------------------------------------
--  ADMIN PANEL — the owner's own ratings of conversations (fed to the Sales Coach)
-- ---------------------------------------------------------------------
create table if not exists conversation_reviews (
  lead_id uuid primary key references leads (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  note text,
  used_in_batch bigint references learning_batches (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table conversation_reviews enable row level security;
