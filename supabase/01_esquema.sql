-- =========================================================
-- Caribbean Travel · Esquema de base de datos (Supabase)
-- Pegar COMPLETO en: Supabase › SQL Editor › New query › Run
-- Se puede volver a ejecutar sin romper nada.
-- =========================================================

-- ---------- 1. Tablas ----------

-- Destinos / paquetes
create table if not exists public.destinos (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre         text not null check (char_length(nombre) between 2 and 80),
  pais           text,
  frase          text,                       -- frase corta de la tarjeta
  descripcion    text,                       -- "Qué vas a vivir"
  categorias     text[] not null default '{}',  -- playa | ciudad | naturaleza | sabores | cerca
  precio_desde   numeric(10,2) check (precio_desde is null or precio_desde >= 0),
  etiqueta       text,                       -- ej. "8 salidas en dic"
  ruta           text,                       -- ej. "Quito — Panamá — Quito"
  aerolinea      text,
  incluye        jsonb not null default '[]'::jsonb,   -- [{ "titulo": "Bodega", "valor": "23 kg" }]
  itinerario     jsonb not null default '[]'::jsonb,   -- [{ "titulo": "...", "detalle": "..." }]
  destacado      boolean not null default false,       -- aparece en "Salidas confirmadas" de la portada
  publicado      boolean not null default true,        -- false = borrador (solo lo ve el admin)
  orden          integer not null default 0,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Fotos de cada destino (la de orden más bajo es la portada)
create table if not exists public.destino_fotos (
  id            uuid primary key default gen_random_uuid(),
  destino_id    uuid not null references public.destinos(id) on delete cascade,
  url           text not null,
  ruta_storage  text,          -- ruta dentro del bucket, para poder borrarla
  alt           text,
  orden         integer not null default 0,
  creado_en     timestamptz not null default now()
);
create index if not exists destino_fotos_destino_idx on public.destino_fotos(destino_id, orden);

-- Fechas de salida confirmadas
create table if not exists public.salidas (
  id          uuid primary key default gen_random_uuid(),
  destino_id  uuid not null references public.destinos(id) on delete cascade,
  fecha       date not null,
  creado_en   timestamptz not null default now(),
  unique (destino_id, fecha)
);
create index if not exists salidas_destino_idx on public.salidas(destino_id, fecha);

-- Usuarios administradores (vinculados a Supabase Auth)
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  creado_en  timestamptz not null default now()
);

-- ---------- 2. Fecha de actualización automática ----------
create or replace function public.tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

drop trigger if exists destinos_actualizado_en on public.destinos;
create trigger destinos_actualizado_en
  before update on public.destinos
  for each row execute function public.tocar_actualizado_en();

-- ---------- 3. ¿Quién es admin? ----------
create or replace function public.es_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- 4. Seguridad por filas (RLS) ----------
alter table public.destinos      enable row level security;
alter table public.destino_fotos enable row level security;
alter table public.salidas       enable row level security;
alter table public.admins        enable row level security;

-- Destinos: el público ve los publicados; el admin ve y edita todo
drop policy if exists "destinos_leer"    on public.destinos;
drop policy if exists "destinos_admin"   on public.destinos;
create policy "destinos_leer"  on public.destinos for select using (publicado or public.es_admin());
create policy "destinos_admin" on public.destinos for all    using (public.es_admin()) with check (public.es_admin());

-- Fotos
drop policy if exists "fotos_leer"  on public.destino_fotos;
drop policy if exists "fotos_admin" on public.destino_fotos;
create policy "fotos_leer" on public.destino_fotos for select using (
  public.es_admin() or exists (select 1 from public.destinos d where d.id = destino_id and d.publicado)
);
create policy "fotos_admin" on public.destino_fotos for all using (public.es_admin()) with check (public.es_admin());

-- Salidas
drop policy if exists "salidas_leer"  on public.salidas;
drop policy if exists "salidas_admin" on public.salidas;
create policy "salidas_leer" on public.salidas for select using (
  public.es_admin() or exists (select 1 from public.destinos d where d.id = destino_id and d.publicado)
);
create policy "salidas_admin" on public.salidas for all using (public.es_admin()) with check (public.es_admin());

-- Admins: cada admin solo puede ver su propia fila (nadie puede crearse admin desde la web)
drop policy if exists "admins_leer_propio" on public.admins;
create policy "admins_leer_propio" on public.admins for select using (user_id = auth.uid());

-- Permisos de la API
grant usage on schema public to anon, authenticated;
grant select on public.destinos, public.destino_fotos, public.salidas to anon, authenticated;
grant insert, update, delete on public.destinos, public.destino_fotos, public.salidas to authenticated;
grant select on public.admins to authenticated;
grant execute on function public.es_admin() to anon, authenticated;

-- ---------- 5. Almacenamiento de fotos ----------
-- Bucket público de solo lectura; solo el admin sube o borra. Máx. 5 MB por foto.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('destinos', 'destinos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos_storage_subir"   on storage.objects;
drop policy if exists "fotos_storage_editar"  on storage.objects;
drop policy if exists "fotos_storage_borrar"  on storage.objects;
create policy "fotos_storage_subir"  on storage.objects for insert to authenticated
  with check (bucket_id = 'destinos' and public.es_admin());
create policy "fotos_storage_editar" on storage.objects for update to authenticated
  using (bucket_id = 'destinos' and public.es_admin());
create policy "fotos_storage_borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'destinos' and public.es_admin());
