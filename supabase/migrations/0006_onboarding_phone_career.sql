-- =============================================================================
-- 0006 · Onboarding: teléfono (anti-fraude) + carrera
-- Aplicar en: Supabase Dashboard > SQL Editor > New query > Run
-- =============================================================================

-- Nuevas columnas de perfil. IF NOT EXISTS = idempotente.
alter table public.users
  add column if not exists phone  text,
  add column if not exists career text;

-- Anti-fraude: un teléfono no puede repetirse entre cuentas.
-- Índice único PARCIAL → permite múltiples NULL (cuentas viejas sin teléfono),
-- pero bloquea duplicados cuando el teléfono está cargado.
create unique index if not exists users_phone_unique
  on public.users (phone)
  where phone is not null;
