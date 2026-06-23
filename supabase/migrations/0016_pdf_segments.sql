-- Divisor de PDFs: rangos de páginas por apunte
alter table public.notes add column if not exists page_from integer;
alter table public.notes add column if not exists page_to   integer;
