-- =========================================================
-- NUEVO MÓDULO · Cruceros (MSC Opera, sin visa)
-- Cada fila es una RUTA del crucero (Catalina Island, Road Town,
-- St. John's, Philipsburg…) con su recorrido y sus fechas.
-- Las fechas no llevan precio y "Qué incluye" es fijo en el sitio.
--
-- Ejecutar UNA vez en: Supabase › SQL Editor › New query › Run
-- No toca destinos ni salidas confirmadas.
-- Se puede volver a ejecutar sin romper ni duplicar nada.
-- =========================================================

-- ---------- 1. Tabla ----------
create table if not exists public.cruceros (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null check (char_length(nombre) between 2 and 40),   -- botón: "Catalina Island"
  etiqueta       text check (etiqueta is null or char_length(etiqueta) <= 20), -- ej. "Ruta 1"
  recorrido      text[] not null default '{}',   -- puertos en orden: {"La Romana","Road Town (Tórtola)",…}
  barco          text not null default 'MSC Opera',
  duracion       text not null default '8 días / 7 noches',
  fechas         date[] not null default '{}',   -- fechas de salida
  publicado      boolean not null default true,
  orden          integer not null default 0,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists cruceros_orden_idx on public.cruceros(publicado, orden);

-- Fecha de actualización automática (la función ya existe desde 01_esquema.sql)
drop trigger if exists cruceros_actualizado_en on public.cruceros;
create trigger cruceros_actualizado_en
  before update on public.cruceros
  for each row execute function public.tocar_actualizado_en();

-- ---------- 2. Seguridad (RLS) ----------
-- El público solo ve las rutas publicadas; solo el admin crea, edita y borra.
alter table public.cruceros enable row level security;

drop policy if exists "cruceros_leer"  on public.cruceros;
drop policy if exists "cruceros_admin" on public.cruceros;
create policy "cruceros_leer"  on public.cruceros for select using (publicado or public.es_admin());
create policy "cruceros_admin" on public.cruceros for all
  using (public.es_admin()) with check (public.es_admin());

grant select on public.cruceros to anon, authenticated;
grant insert, update, delete on public.cruceros to authenticated;

-- ---------- 3. Las 4 rutas del volante (solo si la tabla está vacía) ----------
insert into public.cruceros (nombre, etiqueta, recorrido, fechas, orden)
select v.nombre, v.etiqueta, v.recorrido, v.fechas, v.orden
from (values
  ('Catalina Island', 'Ruta 1',
    array['La Romana','Road Town (Tórtola)','Pointe-à-Pitre (Guadalupe)','Fort-de-France (Martinica)','Bridgetown (Barbados)','La Romana'],
    array['2026-11-16','2026-11-30','2026-12-14','2027-02-08','2027-04-12','2027-04-26','2027-05-10','2027-05-24',
          '2027-06-07','2027-06-21','2027-07-05','2027-07-19','2027-08-02','2027-08-16','2027-08-30',
          '2027-09-13','2027-09-27','2027-10-11','2027-10-25']::date[], 0),
  ('Road Town', 'Ruta 2',
    array['La Romana','Road Town (Tórtola)','Virgin Gorda','Philipsburg (St. Maarten)','Basseterre (St. Kitts y Nevis)','La Romana'],
    array['2026-12-07','2027-02-01','2027-02-15','2027-03-01','2027-03-15']::date[], 1),
  ('St. John''s', 'Ruta 3',
    array['La Romana','Road Town (Tórtola)','St. John''s (Antigua y Barbuda)','Fort-de-France (Martinica)','Bridgetown (Barbados)','La Romana'],
    array['2026-12-28','2027-01-25','2027-02-22','2027-03-08']::date[], 2),
  ('Philipsburg', 'Ruta 4',
    array['La Romana','Virgin Gorda','Philipsburg (St. Maarten)','St. John''s (Antigua y Barbuda)','Fort-de-France (Martinica)','La Romana'],
    array['2027-04-19','2027-05-03','2027-05-17','2027-05-31','2027-06-14','2027-06-28','2027-07-12','2027-07-26',
          '2027-08-09','2027-08-23','2027-09-06','2027-09-20','2027-10-04','2027-10-18']::date[], 3)
) as v(nombre, etiqueta, recorrido, fechas, orden)
where not exists (select 1 from public.cruceros);

-- Que la API vea la tabla nueva de inmediato
notify pgrst, 'reload schema';

-- Comprobar
select nombre, etiqueta, array_length(fechas, 1) as fechas, publicado
from public.cruceros order by orden;
