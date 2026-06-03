-- Permite el plan 'basico' en users.plan.
-- La constraint original solo aceptaba 'free' y 'pro', por lo que toda
-- activación de Básico (confirm + webhook) fallaba silenciosamente y el
-- usuario quedaba en 'free' (rebotando a /pagar).
alter table public.users drop constraint if exists users_plan_check;
alter table public.users
  add constraint users_plan_check
  check (plan = any (array['free'::text, 'basico'::text, 'pro'::text]));
