-- =====================================================
-- Caribbean Travel · Registro de clientes para promociones
-- Ejecutar en Supabase › SQL Editor › New query › Run
-- =====================================================

create table if not exists public.clientes (
  id                   uuid primary key default gen_random_uuid(),
  nombres_apellidos    text not null
                       check (char_length(nombres_apellidos) between 3 and 120),
  email                text not null
                       check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  celular              text not null
                       check (celular ~ '^\+[0-9]{10,15}$'),
  acepta_email         boolean not null default false,
  acepta_whatsapp      boolean not null default false,
  consentimiento_fecha timestamptz not null default now(),
  origen               text not null default 'web',
  activo               boolean not null default true,   -- false = se dio de baja
  fecha_baja           timestamptz,
  creado_en            timestamptz not null default now(),
  -- Debe aceptar al menos un canal para registrarse
  constraint acepta_algun_canal check (acepta_email or acepta_whatsapp)
);

-- Un solo registro por correo (sin importar mayúsculas)
create unique index if not exists clientes_email_unico
  on public.clientes (lower(email));

-- Limpia los datos antes de guardar:
-- nombre sin espacios sobrantes, correo en minúsculas,
-- celular en formato internacional (0987654321 -> +593987654321) para WhatsApp
create or replace function public.normalizar_cliente()
returns trigger
language plpgsql
as $$
begin
  new.nombres_apellidos := regexp_replace(trim(new.nombres_apellidos), '\s+', ' ', 'g');
  new.email   := lower(trim(new.email));
  new.celular := regexp_replace(coalesce(new.celular, ''), '[^0-9+]', '', 'g');

  if new.celular ~ '^09[0-9]{8}$' then
    new.celular := '+593' || substr(new.celular, 2);
  elsif new.celular ~ '^593[0-9]{9}$' then
    new.celular := '+' || new.celular;
  end if;

  if new.activo = false and new.fecha_baja is null then
    new.fecha_baja := now();
  end if;

  return new;
end;
$$;

drop trigger if exists clientes_normalizar on public.clientes;
create trigger clientes_normalizar
  before insert or update on public.clientes
  for each row execute function public.normalizar_cliente();

-- ===================== Seguridad (RLS) =====================
alter table public.clientes enable row level security;

-- Cualquier visitante de la web puede REGISTRARSE (solo insertar)
drop policy if exists "clientes_registro_publico" on public.clientes;
create policy "clientes_registro_publico" on public.clientes
  for insert to anon, authenticated
  with check (activo = true and fecha_baja is null);

-- Solo los administradores pueden VER, EDITAR y BORRAR la lista
drop policy if exists "clientes_admin_leer" on public.clientes;
create policy "clientes_admin_leer" on public.clientes
  for select to authenticated using (public.es_admin());

drop policy if exists "clientes_admin_editar" on public.clientes;
create policy "clientes_admin_editar" on public.clientes
  for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists "clientes_admin_borrar" on public.clientes;
create policy "clientes_admin_borrar" on public.clientes
  for delete to authenticated using (public.es_admin());

-- ============ Vistas listas para exportar campañas ============
-- (security_invoker: respetan el RLS, así que solo los admins ven datos)
create or replace view public.clientes_promo_email
with (security_invoker = true) as
  select nombres_apellidos, email
  from public.clientes
  where activo and acepta_email
  order by creado_en desc;

create or replace view public.clientes_promo_whatsapp
with (security_invoker = true) as
  select nombres_apellidos, celular
  from public.clientes
  where activo and acepta_whatsapp
  order by creado_en desc;
