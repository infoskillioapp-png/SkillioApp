-- =============================================================================
-- 0013 · Tracking de tokens + ledger de pagos (para el panel /admin)
--   · ai_outputs.input_tokens / output_tokens → costo real por generación.
--   · payments → historial real de cobros (se llena desde el webhook de MP).
-- Aplicar en: Supabase Dashboard > SQL Editor, o vía Management API.
-- =============================================================================

alter table public.ai_outputs
  add column if not exists input_tokens  int,
  add column if not exists output_tokens int;

create table if not exists public.payments (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references public.users (id) on delete set null,
  mp_id       text,                 -- id del pago / authorized_payment de MercadoPago
  kind        text,                 -- 'authorized_payment' | 'payment'
  amount      numeric     not null default 0,
  currency    text        not null default 'ARS',
  status      text        not null default 'approved',
  email       text,
  created_at  timestamptz not null default now()
);

-- Idempotencia: los reintentos del webhook no duplican el pago (onConflict mp_id).
-- Index no-parcial para que sirva como target de upsert; múltiples NULL se
-- permiten igual (Postgres trata los NULL como distintos en índices únicos).
create unique index if not exists payments_mp_id_idx on public.payments (mp_id);
create index if not exists payments_created_idx on public.payments (created_at desc);
create index if not exists payments_user_idx     on public.payments (user_id);

alter table public.payments enable row level security;
-- Sin policies públicas: se escribe/lee con la service role key (supabaseAdmin).
