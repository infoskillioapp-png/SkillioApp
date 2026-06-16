-- =============================================================================
-- 0014 · Metadata de Comunidad
-- Para que los apuntes compartidos queden categorizados y buscables (hoy se
-- comparten sin orden, con el nombre de archivo crudo). Se llenan al compartir
-- desde "Mis apuntes" (popup). Viven en notes porque Comunidad = notes públicas.
-- =============================================================================

alter table public.notes
  add column if not exists comm_kind       text,   -- resumen | apunte | toma_notas | parcial | final | otro
  add column if not exists comm_university text,
  add column if not exists comm_career     text,
  add column if not exists comm_subject     text,
  add column if not exists comm_year        smallint,
  add column if not exists comm_month       smallint; -- 1..12, opcional

-- Índices para filtrar el feed por categoría.
create index if not exists notes_comm_kind_idx    on public.notes (comm_kind)    where is_public = true;
create index if not exists notes_comm_subject_idx  on public.notes (comm_subject) where is_public = true;
create index if not exists notes_comm_year_idx     on public.notes (comm_year)    where is_public = true;
