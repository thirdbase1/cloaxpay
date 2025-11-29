-- Auto-create merchant profile when a new user signs up
create or replace function public.handle_new_merchant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.merchants (id, business_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'business_name', 'Untitled Business'),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_merchant();
