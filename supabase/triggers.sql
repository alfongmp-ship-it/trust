-- Trust — triggers
-- Pegar este archivo completo en el SQL Editor de Supabase y ejecutar.
-- Este trigger sincroniza auth.users con public.users automáticamente.

-- ============================================================
-- handle_new_user()
-- Cuando hay nuevo registro en auth.users (signup), inserta
-- la fila correspondiente en public.users con mismo id +
-- los datos que vinieron en raw_user_meta_data (full_name, phone).
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
