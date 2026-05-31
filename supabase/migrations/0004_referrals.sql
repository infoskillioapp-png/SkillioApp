-- Agregar referral_token y referred_by a la tabla users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_token TEXT UNIQUE DEFAULT substring(md5(random()::text || gen_random_uuid()::text), 1, 10),
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Asignar tokens a usuarios existentes que no tengan
UPDATE public.users
SET referral_token = substring(md5(random()::text || id::text), 1, 10)
WHERE referral_token IS NULL;

-- Tabla de historial de referidos
CREATE TABLE IF NOT EXISTS public.referrals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  UNIQUE(referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
