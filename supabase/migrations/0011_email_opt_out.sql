-- =============================================================================
-- 0011 · Baja de emails (one-click unsubscribe)
-- Marca de "no enviar más mails" por usuario. La prende el endpoint
-- /api/unsubscribe cuando el usuario toca "Cancelar suscripción" (Gmail/Yahoo
-- hacen un POST one-click). El envío en resend.ts la respeta antes de mandar.
-- Aplicar en: Supabase Dashboard > SQL Editor > New query > Run
-- =============================================================================

alter table public.users
  add column if not exists email_opt_out boolean not null default false;
