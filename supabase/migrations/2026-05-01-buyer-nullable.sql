-- Trust — migración 2026-05-01
-- Hace buyer_id nullable y agrega check para evitar self-deal.
-- Pegar en SQL Editor de Supabase y ejecutar.

-- buyer_id pasa a nullable: una transacción se crea sin buyer y
-- se reclama después por otro usuario vía link compartido.
alter table public.transactions
  alter column buyer_id drop not null;

-- Defensa en DB: prohíbe que seller y buyer sean el mismo user.
alter table public.transactions
  add constraint transactions_seller_buyer_diff
  check (buyer_id is null or seller_id <> buyer_id);
