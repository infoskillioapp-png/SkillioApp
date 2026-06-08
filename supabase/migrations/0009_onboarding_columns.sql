-- =============================================================================
-- 0009 · Columnas de onboarding que faltaban en prod
-- El viejo scripts/migrate-onboarding.mjs nunca llegó a aplicarlas (solo
-- imprimía el SQL). Sin el muro, el onboarding ahora SÍ se usa y las necesita.
-- Aplicar en: Supabase Dashboard > SQL Editor > New query > Run
-- =============================================================================

alter table public.users
  add column if not exists age                  smallint,
  add column if not exists institution          text,
  add column if not exists onboarding_completed boolean not null default false;
