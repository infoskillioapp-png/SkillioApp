-- =============================================================================
-- 0010 · Inicio de la "oferta de lanzamiento" (cronómetro de 12h)
-- Marca el momento exacto en que el usuario completa el onboarding. Desde ahí
-- corren las 12h del precio de lanzamiento ($16.000). El precio NO cambia al
-- vencer: el reloj es urgencia psicológica, no un cambio real de tarifa.
-- Aplicar en: Supabase Dashboard > SQL Editor > New query > Run
-- =============================================================================

alter table public.users
  add column if not exists offer_started_at timestamptz;
