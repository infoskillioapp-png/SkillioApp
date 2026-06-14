-- =============================================================================
-- 0012 · Onboarding-demo, activación y adquisición (UTMs) + funnel events
--
-- Soporta el rediseño de onboarding (demo guiado de 3 pasos) y la medición:
--   · demo_completed  → el usuario terminó el demo guiado (no vuelve a verlo).
--   · activated_at    → primera generación con material PROPIO (evento clave Meta).
--   · acquisition     → UTMs capturadas en el alta (de dónde vino, qué ángulo).
--   · funnel_events   → instrumentación fina del onboarding (entradas/salidas de
--                       cada paso) para medir dónde se cae la gente desde Supabase.
-- Aplicar en: Supabase Dashboard > SQL Editor > New query > Run
-- =============================================================================

alter table public.users
  add column if not exists demo_completed boolean     not null default false,
  add column if not exists activated_at   timestamptz,
  add column if not exists acquisition    jsonb;

-- Backfill: los usuarios que YA pasaron el onboarding (registrados antes de
-- este rediseño) no deben ser forzados al demo. Solo los nuevos lo verán.
update public.users
   set demo_completed = true
 where onboarding_completed = true
   and demo_completed = false;

-- Índice parcial para contar activaciones rápido (solo filas activadas).
create index if not exists users_activated_at_idx
  on public.users (activated_at)
  where activated_at is not null;

-- ---------------------------------------------------------------------------
-- funnel_events · una fila por evento de instrumentación del onboarding/funnel.
-- event: 'onboarding_step_enter', 'onboarding_step_exit', 'demo_step_enter',
--        'demo_step_exit', 'demo_generate', 'demo_completed', 'activation', etc.
-- step:  identificador del paso ('profile', 'demo_1', 'demo_2', 'demo_3'…).
-- meta:  payload libre (duración, resultado, etc).
-- ---------------------------------------------------------------------------
create table if not exists public.funnel_events (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references public.users (id) on delete cascade,
  event      text        not null,
  step       text,
  meta       jsonb,
  created_at timestamptz not null default now()
);

create index if not exists funnel_events_user_idx  on public.funnel_events (user_id);
create index if not exists funnel_events_event_idx on public.funnel_events (event, created_at);

alter table public.funnel_events enable row level security;
-- Sin policies públicas: se escribe/lee con la service role key (supabaseAdmin).
