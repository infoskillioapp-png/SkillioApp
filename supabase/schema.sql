-- =============================================================================
-- SKILIO · Schema inicial
-- Aplicar en: Supabase Dashboard > SQL Editor > New query > Run
-- =============================================================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- =============================================================================
-- USERS
-- Una fila por usuario de Clerk. clerk_user_id es el puente.
-- =============================================================================
create table if not exists public.users (
  id              uuid primary key default uuid_generate_v4(),
  clerk_user_id   text unique not null,
  email           text unique not null,
  full_name       text,
  avatar_url      text,
  plan            text not null default 'free' check (plan in ('free', 'basico', 'pro')),
  credits         int  not null default 0,
  current_streak  int  not null default 0,
  longest_streak  int  not null default 0,
  total_xp        int  not null default 0,
  level           int  not null default 1,
  referred_by     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists users_clerk_idx on public.users (clerk_user_id);

-- =============================================================================
-- SUBJECTS (materias)
-- =============================================================================
create table if not exists public.subjects (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  code            text,
  name            text not null,
  professor       text,
  color           text default '#A5402D',
  avg_grade       numeric(4,1),
  hours_studied   numeric(6,1) default 0,
  attendance_pct  int default 100,
  created_at      timestamptz not null default now()
);
create index if not exists subjects_user_idx on public.subjects (user_id);

-- =============================================================================
-- EVENTS (agenda)
-- =============================================================================
create table if not exists public.events (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  subject_id  uuid references public.subjects(id) on delete set null,
  title       text not null,
  kind        text not null default 'class'
              check (kind in ('class', 'exam', 'midterm', 'tp', 'study', 'other')),
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  room        text,
  professor   text,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists events_user_time_idx on public.events (user_id, starts_at);

-- =============================================================================
-- POMODORO SESSIONS
-- =============================================================================
create table if not exists public.pomodoro_sessions (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.users(id) on delete cascade,
  subject_id        uuid references public.subjects(id) on delete set null,
  mode              text not null check (mode in ('focus', 'short_break', 'long_break')),
  duration_minutes  int not null,
  completed         boolean not null default false,
  xp_earned         int not null default 0,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz
);
create index if not exists pomodoro_user_idx
  on public.pomodoro_sessions (user_id, started_at desc);

-- =============================================================================
-- NOTES (apuntes subidos)
-- =============================================================================
create table if not exists public.notes (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  subject_id      uuid references public.subjects(id) on delete set null,
  title           text not null,
  file_name       text not null,
  file_path       text not null,         -- key dentro del bucket notes-uploads
  file_type       text,                  -- pdf, image, docx, etc.
  file_size_bytes bigint,
  is_public       boolean not null default false,
  downloads       int not null default 0,
  likes           int not null default 0,
  has_ai_content  boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists notes_user_idx on public.notes (user_id);
create index if not exists notes_public_idx on public.notes (is_public)
  where is_public = true;

-- =============================================================================
-- XP LOG (auditoria de XP, alimenta logros y graficos)
-- =============================================================================
create table if not exists public.xp_log (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  source      text not null,            -- 'pomodoro', 'test', 'referral', etc.
  amount      int not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists xp_user_time_idx on public.xp_log (user_id, created_at desc);

-- =============================================================================
-- USER ACHIEVEMENTS (insignias desbloqueadas)
-- =============================================================================
create table if not exists public.user_achievements (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  achievement_key text not null,
  unlocked_at     timestamptz not null default now(),
  unique (user_id, achievement_key)
);

-- =============================================================================
-- TRIGGER updated_at en users
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- Deny-all por defecto. Todas las escrituras pasan por route handlers
-- de Next que usan SUPABASE_SERVICE_ROLE_KEY (bypassa RLS) y verifican
-- la session de Clerk antes de operar.
-- =============================================================================
alter table public.users              enable row level security;
alter table public.subjects           enable row level security;
alter table public.events             enable row level security;
alter table public.pomodoro_sessions  enable row level security;
alter table public.notes              enable row level security;
alter table public.xp_log             enable row level security;
alter table public.user_achievements  enable row level security;

-- Unica policy publica: lectura del feed de Comunidad
drop policy if exists "public can read shared notes" on public.notes;
create policy "public can read shared notes"
  on public.notes for select
  using (is_public = true);
