-- =============================================================================
-- SKILLIO · Migracion 0002 — IA Premium
-- =============================================================================

-- Tabla para guardar outputs generados por la IA
create table if not exists public.ai_outputs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.users(id) on delete cascade,
  note_id       uuid references public.notes(id) on delete set null,
  kind          text not null check (kind in ('summary', 'flashcards', 'simulacro')),
  format        text,                  -- 'puntos_clave' | 'mapa' | 'ficha' para summaries
  title         text,                  -- titulo legible (puede venir del nombre del apunte)
  content       jsonb not null,        -- el output estructurado (texto o array de items)
  credits_used  int not null default 0,
  model         text default 'claude-sonnet-4-6',
  created_at    timestamptz not null default now()
);
create index if not exists ai_outputs_user_idx
  on public.ai_outputs (user_id, created_at desc);
alter table public.ai_outputs enable row level security;

-- Default de creditos para usuarios nuevos: 1000 (tier inicial generoso para v1)
alter table public.users alter column credits set default 1000;

-- Bump retroactivo: a quien tenga menos de 1000 (ej: usuario creado antes), darle 1000
update public.users set credits = 1000 where credits < 1000;
