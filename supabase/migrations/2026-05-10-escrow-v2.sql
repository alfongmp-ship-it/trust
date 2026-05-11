-- Trust — Schema v2 (escrow notarial de documentos)
-- Extiende transactions y files para soportar: lista negociable,
-- depósito simulado, upload de PDF con watermark, disputa con IA.
-- Idempotente: usa IF NOT EXISTS donde Postgres lo permite.

-- ============================================================
-- 1. Nuevos valores en transaction_status
--    Los viejos se mantienen para no romper datos seed; el código
--    nuevo sólo usa los nuevos.
-- ============================================================
alter type transaction_status add value if not exists 'borrador_lista';
alter type transaction_status add value if not exists 'negociando_lista';
alter type transaction_status add value if not exists 'lista_acordada';
alter type transaction_status add value if not exists 'pagada';
alter type transaction_status add value if not exists 'entregada';
alter type transaction_status add value if not exists 'en_edicion';
alter type transaction_status add value if not exists 'completada';
alter type transaction_status add value if not exists 'reembolsada';

-- ============================================================
-- 2. transactions: columnas para checklist, timestamps de hitos
--    y campos de disputa.
-- ============================================================
alter table public.transactions
  add column if not exists checklist jsonb default '[]'::jsonb,
  add column if not exists checklist_version integer not null default 1,
  add column if not exists checklist_last_proposed_by text
    check (checklist_last_proposed_by in ('seller', 'buyer')),
  add column if not exists paid_at timestamptz,
  add column if not exists delivery_uploaded_at timestamptz,
  add column if not exists dispute_opened_at timestamptz,
  add column if not exists dispute_point_id text,
  add column if not exists dispute_buyer_comment text,
  add column if not exists dispute_seller_response text,
  add column if not exists dispute_ai_verdict text
    check (dispute_ai_verdict in ('favor_buyer', 'favor_seller')),
  add column if not exists dispute_ai_reasoning text,
  add column if not exists resolved_at timestamptz;

-- ============================================================
-- 3. files: columnas para versionado + tipo (original vs watermarked)
--    + storage_path (path en el bucket de Supabase Storage).
--    La columna url legacy se vuelve nullable; el código nuevo
--    usa exclusivamente storage_path.
-- ============================================================
alter table public.files
  add column if not exists version integer not null default 1,
  add column if not exists kind text
    check (kind in ('original', 'watermarked')),
  add column if not exists storage_path text,
  add column if not exists uploaded_by uuid references public.users(id) on delete restrict;

alter table public.files alter column url drop not null;

create index if not exists files_transaction_version_idx
  on public.files(transaction_id, version);
