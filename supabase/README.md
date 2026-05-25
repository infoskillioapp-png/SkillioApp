# Supabase setup — Skilio

## 1) Aplicar el schema

1. Abrí tu proyecto en https://supabase.com/dashboard
2. Menú lateral → **SQL Editor** → **New query**
3. Copiá todo el contenido de `schema.sql` y pegalo
4. **Run**

Cuando termine deberías ver en **Table Editor** estas tablas:

- `users`
- `subjects`
- `events`
- `pomodoro_sessions`
- `notes`
- `xp_log`
- `user_achievements`

Todas con RLS habilitado (ícono de candado verde).

## 2) Crear el bucket de Storage

1. Menú lateral → **Storage** → **New bucket**
2. Nombre: **`notes-uploads`**
3. Public bucket: **OFF** (privado — los apuntes se sirven con URLs firmadas)
4. **Create**

## 3) Verificar variables de entorno

En `.env.local` (raíz del proyecto) deben estar:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   ← la "anon public"
SUPABASE_SERVICE_ROLE_KEY=eyJ...        ← la "service_role" (Settings → API)
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` bypassa RLS — nunca exponerla al cliente
> ni commitearla. Todas las escrituras de Skilio van por route handlers
> de Next que primero verifican la sesión de Clerk.
