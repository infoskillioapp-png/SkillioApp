-- =============================================================================
-- 0020 · Relanzamiento: Pase de cuatrimestre + downsell único + medición
--
--   1. Plan 'pase' (pago único, 120 días, sin renovación) en el constraint.
--   2. users.discount_offered_at: el regalo 25% OFF se ofrece UNA sola vez.
--   3. users.meta_fbp / meta_fbc: cookies de Meta guardadas en el checkout para
--      que el Purchase server-side (webhook, sin navegador) matchee mejor.
--   4. payments: plan, promo, cuotas y suscripción → medir % de ventas con
--      SKILLIO25 y mandar a Meta SOLO la primera venta de cada suscripción.
-- Todo aditivo: no rompe el código viejo. Aplicar vía Management API.
-- =============================================================================

alter table public.users drop constraint if exists users_plan_check;
alter table public.users add constraint users_plan_check
  check (plan in ('free', 'pro', 'semanal', 'trimestral', 'pase'));

alter table public.users add column if not exists discount_offered_at timestamptz;
alter table public.users add column if not exists meta_fbp text;
alter table public.users add column if not exists meta_fbc text;

alter table public.payments add column if not exists plan text;
alter table public.payments add column if not exists promo text;
alter table public.payments add column if not exists installments int;
alter table public.payments add column if not exists mp_subscription_id text;
alter table public.payments add column if not exists payment_method text;

create index if not exists payments_mp_subscription_idx
  on public.payments (mp_subscription_id);
