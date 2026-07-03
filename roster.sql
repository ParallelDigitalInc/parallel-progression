-- Parallel Progression — roster (email → role)
-- Run once in Supabase → SQL Editor. Seeds each person's real current role so
-- login auto-resolves it (no manual role-picking). Re-runnable: upserts by email.
-- Source: Master employee sheet, 2026-07. Muzammil Merchant (Visual Designer)
-- deliberately left out — no Visual track in the Product Design rubric yet.

create table if not exists public.roster (
  email text primary key,
  role text not null,
  updated_at timestamptz not null default now()
);

alter table public.roster enable row level security;

-- Any signed-in user may read the roster (the app looks up their own role on login).
drop policy if exists "roster: authenticated read" on public.roster;
create policy "roster: authenticated read"
  on public.roster for select
  using (auth.role() = 'authenticated');

insert into public.roster (email, role) values
  ('ria.gupta@parallelhq.com',      'Product Designer'),
  ('sanoop.menon@parallelhq.com',   'Product Designer'),
  ('nupra.dharod@parallelhq.com',   'Product Designer'),
  ('sanchari.saha@parallelhq.com',  'Product Designer'),
  ('kankshyat@parallelhq.com',      'Product Designer'),
  ('mallika@parallelhq.com',        'Product Designer'),
  ('nikhilkumar@parallelhq.com',    'Product Designer'),
  ('sushma.bhandari@parallelhq.com','Senior Product Designer'),
  ('samridhi@parallelhq.com',       'Senior Product Designer'),
  ('adil@parallelhq.com',           'Senior Product Designer'),
  ('shreya@parallelhq.com',         'Design Lead')
on conflict (email) do update set role = excluded.role, updated_at = now();
