-- Create admin role check function
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
as $$
begin
  -- Check if user has admin role in metadata
  return (
    select coalesce(
      (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean,
      false
    )
  );
end;
$$;

-- Admin policies for viewing all merchants
create policy "Admins can view all merchants"
  on public.merchants for select
  using (is_admin());

-- Admin policies for viewing all transactions
create policy "Admins can view all transactions"
  on public.transactions for select
  using (is_admin());

-- Admin policies for managing unresolved transactions
create policy "Admins can view all unresolved transactions"
  on public.unresolved_transactions for select
  using (is_admin());

create policy "Admins can update unresolved transactions"
  on public.unresolved_transactions for update
  using (is_admin());

-- Admin policies for batch payouts
create policy "Admins can view all batch payouts"
  on public.batch_payouts for select
  using (is_admin());

create policy "Admins can create batch payouts"
  on public.batch_payouts for insert
  with check (is_admin());

create policy "Admins can update batch payouts"
  on public.batch_payouts for update
  using (is_admin());
