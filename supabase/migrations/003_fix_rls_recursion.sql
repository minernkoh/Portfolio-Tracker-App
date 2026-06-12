-- Fix infinite recursion in RLS policies.
--
-- The original policies checked for admin via a subquery on public.profiles.
-- On profiles itself that is self-referential, and Postgres raises
-- "infinite recursion detected in policy for relation profiles"; the
-- transactions policies hit the same error transitively because their
-- subquery on profiles re-evaluates the profiles policy.
--
-- Fix: move the admin check into a security definer function. It runs with
-- the function owner's privileges, so it reads profiles without re-entering
-- RLS evaluation.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Recreate policies using is_admin() instead of inline subqueries.

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "transactions_select" on public.transactions;
create policy "transactions_select"
  on public.transactions for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "transactions_insert" on public.transactions;
create policy "transactions_insert"
  on public.transactions for insert
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "transactions_update" on public.transactions;
create policy "transactions_update"
  on public.transactions for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "transactions_delete" on public.transactions;
create policy "transactions_delete"
  on public.transactions for delete
  using (auth.uid() = user_id or public.is_admin());
