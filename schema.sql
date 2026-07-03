-- Parallel Progression — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

-- ---------- Superadmins ----------
-- Add more emails to this list as needed; keep it in sync with SUPERADMINS in app.js.
create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') in (
      'shreya@parallelhq.com',          -- Design Lead
      'robin@parallelhq.com',           -- Design Director / Founder
      'haripriya.vellodi@parallelhq.com', -- Project Delivery Manager
      'kriti@parallelhq.com'            -- Human Resources
    ),
    false
  );
$$;

-- ---------- Users ----------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text,
  role text default 'Product Designer',
  desired_role text default 'Senior Product Designer',
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users: read own or admin"
  on public.users for select
  using (auth.uid() = id or public.is_admin());

create policy "users: insert own"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users: update own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------- Self-evaluations ----------
-- One row per user x competency; upserted so the assessment is resumable.
create table if not exists public.self_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  competency_slug text not null,
  rating text not null check (rating in ('building', 'established', 'leading')),
  evidence_note text,
  role_at_eval text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, competency_slug)
);

alter table public.self_evaluations enable row level security;

create policy "evals: read own or admin"
  on public.self_evaluations for select
  using (auth.uid() = user_id or public.is_admin());

create policy "evals: insert own"
  on public.self_evaluations for insert
  with check (auth.uid() = user_id);

create policy "evals: update own"
  on public.self_evaluations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "evals: delete own"
  on public.self_evaluations for delete
  using (auth.uid() = user_id);
