-- Auto-promote specific email to admin role on signup
create or replace function public.handle_new_merchant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.merchants (id, business_name, email, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'business_name', 'Untitled Business'),
    new.email,
    -- Auto-promote this specific email to admin
    case when new.email = 'ighanghangodspower@gmail.com' then true else false end
  )
  on conflict (id) do update set
    is_admin = case when excluded.email = 'ighanghangodspower@gmail.com' then true else merchants.is_admin end;

  return new;
end;
$$;
