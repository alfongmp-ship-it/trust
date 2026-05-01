-- Trust — schema base
-- Pegar este archivo completo en el SQL Editor de Supabase y ejecutar.

-- ============================================================
-- ENUM types
-- ============================================================
create type transaction_type as enum ('boleto', 'documento', 'objeto');

create type transaction_status as enum (
  'esperando_pago',
  'pendiente_entrega',
  'en_revision',
  'completado',
  'en_disputa'
);

-- ============================================================
-- users
-- Perfil de usuario ligado 1:1 a auth.users (Supabase Auth).
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- transactions
-- ============================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete restrict,
  buyer_id  uuid not null references public.users(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  type transaction_type not null,
  description text,
  status transaction_status not null default 'esperando_pago',
  delivery_deadline timestamptz,
  delivered_at timestamptz,
  release_at timestamptz,
  created_at timestamptz not null default now()
);

create index transactions_seller_id_idx on public.transactions(seller_id);
create index transactions_buyer_id_idx  on public.transactions(buyer_id);
create index transactions_status_idx    on public.transactions(status);

-- ============================================================
-- files
-- ============================================================
create table public.files (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  url text not null,
  watermarked_url text,
  file_type text,
  created_at timestamptz not null default now()
);

create index files_transaction_id_idx on public.files(transaction_id);
