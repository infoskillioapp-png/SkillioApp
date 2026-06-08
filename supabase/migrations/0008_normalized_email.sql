-- =============================================================================
-- 0008 · Anti-fraude por email: normalized_email
-- Gmail ignora puntos y +alias → juan.perez+1@gmail = juanperez@gmail. Guardamos
-- la forma normalizada para detectar cuentas duplicadas del mismo Gmail real.
-- Aplicar en: Supabase Dashboard > SQL Editor > New query > Run
-- =============================================================================

alter table public.users
  add column if not exists normalized_email text;

-- Backfill de filas existentes (misma lógica que normalizeEmail en TS):
--   gmail/googlemail → sacar puntos del local + cortar en '+' → @gmail.com
--   otros            → solo cortar el local en '+'
update public.users
set normalized_email = case
  when split_part(lower(trim(email)), '@', 2) in ('gmail.com', 'googlemail.com')
    then replace(split_part(split_part(lower(trim(email)), '@', 1), '+', 1), '.', '') || '@gmail.com'
  else split_part(split_part(lower(trim(email)), '@', 1), '+', 1)
       || '@' || split_part(lower(trim(email)), '@', 2)
end
where normalized_email is null;

-- Un mismo Gmail real no puede tener dos cuentas. Índice parcial → permite NULL.
create unique index if not exists users_normalized_email_unique
  on public.users (normalized_email)
  where normalized_email is not null;
