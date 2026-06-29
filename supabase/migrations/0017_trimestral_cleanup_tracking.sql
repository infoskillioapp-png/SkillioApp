-- =============================================================================
-- 0017 · Plan Trimestral + limpieza de la versión vieja + tracking del funnel
--
--   1. Agrega 'trimestral' al constraint de plan (el webhook ya lo escribe).
--      Retira 'basico' (plan discontinuado) migrando cualquier resto a 'free'.
--   2. Dropea user_achievements (tabla creada pero sin uso en el código).
--   3. Limpia las filas viejas del demo guiado en funnel_events (eventos
--      demo_*) para que el análisis del funnel nuevo arranque limpio.
--   4. Índice de funnel_events por (event, step) para los queries del admin.
-- Aplicar vía Management API (ver memoria ops-deploy).
-- =============================================================================

-- 1 · Plan trimestral + retiro de 'basico' --------------------------------------
update public.users set plan = 'free' where plan = 'basico';

alter table public.users drop constraint if exists users_plan_check;
alter table public.users add constraint users_plan_check
  check (plan in ('free', 'pro', 'semanal', 'trimestral'));

-- 2 · Tabla muerta --------------------------------------------------------------
drop table if exists public.user_achievements cascade;

-- 3 · Limpieza de eventos del demo viejo ----------------------------------------
delete from public.funnel_events
 where event like 'demo%' or step like 'demo%';

-- 4 · Índice para agregaciones del funnel nuevo ---------------------------------
create index if not exists funnel_events_event_step_idx
  on public.funnel_events (event, step);
