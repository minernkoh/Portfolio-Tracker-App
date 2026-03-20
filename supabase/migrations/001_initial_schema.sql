-- Portfolio tracker: profiles (user vs admin) and transactions with RLS.
-- Run in Supabase SQL Editor or via supabase db push after linking a project.

-- Profiles mirror auth.users; role is promoted to admin only in the Supabase dashboard/SQL (never from the client).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  ticker text not null,
  name text,
  type text not null,
  quantity numeric not null,
  price numeric not null,
  total_cost numeric,
  asset_class text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc);

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;

-- New signups get a profile row (default role: user).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS: profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- RLS: transactions — users see only their rows; admins see all.
create policy "transactions_select"
  on public.transactions for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "transactions_insert"
  on public.transactions for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "transactions_update"
  on public.transactions for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "transactions_delete"
  on public.transactions for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Promote a user to admin (run once in SQL editor with their user id):
-- update public.profiles set role = 'admin' where id = '<uuid>';
