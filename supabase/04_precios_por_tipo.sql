-- =========================================================
-- ACTUALIZACIÓN · Precios por tipo de viajero
-- Agrega precio de niño (menor de 11 años) y de adulto mayor.
-- El precio actual (precio_desde) pasa a ser el de ADULTO.
-- Si un precio nuevo queda vacío, el sitio usa el de adulto.
-- Ejecutar UNA vez en: Supabase › SQL Editor › New query › Run
-- No borra ni cambia ningún destino existente.
-- =========================================================

alter table public.destinos
  add column if not exists precio_nino numeric(10,2)
    check (precio_nino is null or precio_nino >= 0),
  add column if not exists precio_adulto_mayor numeric(10,2)
    check (precio_adulto_mayor is null or precio_adulto_mayor >= 0);

comment on column public.destinos.precio_desde        is 'Precio por ADULTO (desde)';
comment on column public.destinos.precio_nino         is 'Precio por niño menor de 11 años; vacío = precio de adulto';
comment on column public.destinos.precio_adulto_mayor is 'Precio por adulto mayor; vacío = precio de adulto';

-- Que la API vea las columnas nuevas de inmediato
notify pgrst, 'reload schema';

-- Comprobar
select nombre, precio_desde as adulto, precio_nino as nino, precio_adulto_mayor as adulto_mayor
from public.destinos order by orden, nombre;
