-- =============================================================================
-- 0018 · ai_usage — consumo de tokens de TODAS las llamadas a la IA
--
-- El admin estimaba el costo solo con ai_outputs (resumen/tarjetas/simulacro),
-- dejando afuera chat de Booki, tips y práctica rápida → subestimaba ~50%.
-- Esta tabla registra el uso de tokens de las 6 rutas de IA para un costo real.
-- Aplicar vía Management API.
-- =============================================================================

create table if not exists public.ai_usage (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references public.users (id) on delete set null,
  kind          text        not null,   -- summarize|flashcards|simulacro|chat|tip|practica
  model         text,
  input_tokens  int,
  output_tokens int,
  created_at    timestamptz not null default now()
);

create index if not exists ai_usage_created_idx on public.ai_usage (created_at desc);
create index if not exists ai_usage_user_idx    on public.ai_usage (user_id);

alter table public.ai_usage enable row level security;
-- Sin policies públicas: se escribe/lee con la service role key (supabaseAdmin).

-- Backfill: traemos el historial ya registrado en ai_outputs (las 3 generaciones
-- que sí guardaban tokens). El chat/tips/práctica del pasado no se puede recuperar.
insert into public.ai_usage (user_id, kind, model, input_tokens, output_tokens, created_at)
select user_id, kind, model, input_tokens, output_tokens, created_at
from public.ai_outputs
where input_tokens is not null or output_tokens is not null;
