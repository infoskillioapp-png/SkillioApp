-- Plan Semanal: agrega columna expires_at y 'semanal' al constraint de plan.
-- PRO (mensual) sigue siendo time-unlimited con créditos; semanal es time-based.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Ampliar constraint para aceptar 'semanal'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE public.users ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('free', 'basico', 'pro', 'semanal'));
