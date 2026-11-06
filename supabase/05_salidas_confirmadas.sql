-- =========================================================
-- NUEVO MÓDULO · Salidas confirmadas
-- Tabla aparte de los destinos: ruta (desde / hacia / ida y
-- vuelta), aerolínea, precio, qué incluye y fechas.
-- Se muestran en la franja azul de la portada.
--
-- Ejecutar UNA vez en: Supabase › SQL Editor › New query › Run
-- No borra ni cambia ningún destino existente.
-- Se puede volver a ejecutar sin romper nada.
-- =========================================================

-- ---------- 1. Tabla ----------
create table if not exists public.salidas_confirmadas (
  id             uuid primary key default gen_random_uuid(),
  origen         text not null check (char_length(origen) between 2 and 40),   -- ej. Quito
  destino        text not null check (char_length(destino) between 2 and 40),  -- ej. Panamá
  ida_vuelta     boolean not null default true,      -- true = Quito — Panamá — Quito
  titulo         text,                               -- título grande opcional
  aerolinea      text,                               -- ej. Aeroregional
  precio_desde   numeric(10,2) check (precio_desde is null or precio_desde >= 0),
  incluye        jsonb not null default '[]'::jsonb, -- [{ "titulo": "Equipaje de bodega", "valor": "23 kg" }]
  fechas         date[] not null default '{}',       -- fechas de salida
  publicado      boolean not null default true,
  orden          integer not null default 0,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists salidas_confirmadas_orden_idx on public.salidas_confirmadas(publicado, orden);

-- Fecha de actualización automática (la función ya existe desde 01_esquema.sql)
drop trigger if exists salidas_confirmadas_actualizado_en on public.salidas_confirmadas;
create trigger salidas_confirmadas_actualizado_en
  before update on public.salidas_confirmadas
  for each row execute function public.tocar_actualizado_en();

-- ---------- 2. Seguridad (RLS) ----------
-- El público solo ve las publicadas; solo el admin crea, edita y borra.
alter table public.salidas_confirmadas enable row level security;

drop policy if exists "salidas_conf_leer"  on public.salidas_confirmadas;
drop policy if exists "salidas_conf_admin" on public.salidas_confirmadas;
create policy "salidas_conf_leer"  on public.salidas_confirmadas for select using (publicado or public.es_admin());
create policy "salidas_conf_admin" on public.salidas_confirmadas for all
  using (public.es_admin()) with check (public.es_admin());

grant select on public.salidas_confirmadas to anon, authenticated;
grant insert, update, delete on public.salidas_confirmadas to authenticated;

-- Que la API vea la tabla nueva de inmediato
notify pgrst, 'reload schema';

-- ---------- 3. (Opcional) Cargar la salida de Panamá del arte actual ----------
-- Quita los "--" de las líneas de abajo si quieres empezar con ella ya creada.
-- insert into public.salidas_confirmadas (origen, destino, ida_vuelta, aerolinea, precio_desde, incluye, fechas, orden)
-- values ('Quito', 'Panamá', true, 'Aeroregional', 450,
--   '[{"titulo":"Equipaje de bodega","valor":"23 kg"},{"titulo":"Equipaje de mano","valor":"10 kg"},{"titulo":"Artículo personal","valor":"Incluido"}]'::jsonb,
--   array['2026-12-02','2026-12-06','2026-12-10','2026-12-14','2026-12-18','2026-12-22','2026-12-26','2026-12-30']::date[], 0);

-- Comprobar
select origen, destino, ida_vuelta, aerolinea, precio_desde, fechas, publicado
from public.salidas_confirmadas order by orden;
