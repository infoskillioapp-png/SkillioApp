-- =============================================================================
-- 0007 · Contador de generaciones gratis (trial sin tarjeta)
-- El free puede generar 3 veces con IA (Haiku). El contador es interno: el
-- usuario NO lo ve (ve 0 créditos). PRO sigue con el sistema de créditos.
-- Aplicar en: Supabase Dashboard > SQL Editor > New query > Run
-- =============================================================================

alter table public.users
  add column if not exists free_generations_used int not null default 0;
