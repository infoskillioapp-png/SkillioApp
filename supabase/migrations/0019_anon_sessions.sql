-- =============================================================================
-- 0019 · Sesión anónima (registro diferido)
--
--   Permite que exista una fila public.users SIN cuenta de Clerk todavía: una
--   sesión anónima identificada por cookie (anon_session_id). El usuario sube
--   apuntes y genera con IA sin registrarse; al pagar, la MISMA fila se
--   "reclama" seteando clerk_user_id + email (Fase 3).
--
--   1. clerk_user_id y email dejan de ser NOT NULL (una fila anónima no tiene
--      ninguno de los dos hasta el pago). El UNIQUE se mantiene: Postgres trata
--      los NULL como distintos, así que muchas filas anónimas conviven.
--   2. Nueva columna anon_session_id + índice único (no parcial, para que sirva
--      de árbitro en el ON CONFLICT del upsert de get-or-create; los NULL siguen
--      siendo distintos entre sí).
--
-- Aplicar vía Management API (ver memoria skillio-ops-deploy). No altera el
-- flujo Clerk existente: las filas actuales ya tienen clerk_user_id + email.
-- =============================================================================

-- 1 · Aflojar NOT NULL ---------------------------------------------------------
alter table public.users alter column clerk_user_id drop not null;
alter table public.users alter column email         drop not null;

-- 2 · Identificador de la sesión anónima (UUID guardado en cookie skillio_anon)
alter table public.users add column if not exists anon_session_id text;
create unique index if not exists users_anon_session_idx
  on public.users (anon_session_id);
