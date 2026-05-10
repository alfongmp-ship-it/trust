-- Trust — RLS + policies
-- Habilita Row Level Security en las 3 tablas y define políticas
-- estrictas pero compatibles con todos los flows existentes.
-- Idempotente: se puede correr múltiples veces.

-- ============================================================
-- ENABLE RLS
-- ============================================================
alter table public.users        enable row level security;
alter table public.transactions enable row level security;
alter table public.files        enable row level security;

-- ============================================================
-- USERS — SELECT
-- Política compuesta:
--   1) Yo siempre puedo leer mi propio perfil.
--   2) Puedo leer perfiles de personas con quienes comparto
--      transacciones (seller↔buyer en cualquier tx).
--   3) Puedo leer el perfil del seller de cualquier transacción
--      unclaimed (necesario para que el claim flow muestre nombre
--      del vendedor antes de reclamar).
-- INSERT: NO se permite vía API. Lo hace el trigger handle_new_user
--         con SECURITY DEFINER (bypass RLS).
-- UPDATE: sólo tu propia fila.
-- DELETE: no en scope.
-- ============================================================
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.transactions t
      where (t.seller_id = (select auth.uid()) and t.buyer_id = users.id)
         or (t.buyer_id  = (select auth.uid()) and t.seller_id = users.id)
    )
    or exists (
      select 1 from public.transactions t
      where t.seller_id = users.id
        and t.buyer_id is null
        and t.seller_id <> (select auth.uid())
    )
  );

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ============================================================
-- TRANSACTIONS — todas las acciones
-- SELECT: seller, buyer, o cualquier user (no-seller) en tx unclaimed.
-- INSERT: cualquier user puede crear, pero seller_id debe ser él
--         y no puede mandarse a sí mismo como buyer.
-- UPDATE: seller, buyer, o cualquier user (no-seller) en tx unclaimed.
--         WITH CHECK exige que después del update el user siga siendo
--         seller o buyer (defense in depth contra "cambiar el buyer
--         a un tercero").
-- DELETE: no en scope.
-- ============================================================
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions
  for select to authenticated
  using (
    seller_id = (select auth.uid())
    or buyer_id = (select auth.uid())
    or (buyer_id is null and seller_id <> (select auth.uid()))
  );

drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions
  for insert to authenticated
  with check (
    seller_id = (select auth.uid())
    and (buyer_id is null or buyer_id <> (select auth.uid()))
  );

drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions
  for update to authenticated
  using (
    seller_id = (select auth.uid())
    or buyer_id = (select auth.uid())
    or (buyer_id is null and seller_id <> (select auth.uid()))
  )
  with check (
    seller_id = (select auth.uid())
    or buyer_id = (select auth.uid())
  );

-- ============================================================
-- FILES — sólo seller o buyer de la transacción asociada.
-- Las pages de files aún no existen, pero dejamos las policies
-- listas para cuando agreguemos UI de upload.
-- ============================================================
drop policy if exists files_select on public.files;
create policy files_select on public.files
  for select to authenticated
  using (
    exists (
      select 1 from public.transactions t
      where t.id = files.transaction_id
        and (t.seller_id = (select auth.uid()) or t.buyer_id = (select auth.uid()))
    )
  );

drop policy if exists files_insert on public.files;
create policy files_insert on public.files
  for insert to authenticated
  with check (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id
        and (t.seller_id = (select auth.uid()) or t.buyer_id = (select auth.uid()))
    )
  );
