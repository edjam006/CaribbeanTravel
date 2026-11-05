-- =========================================================
-- PARCHE · Permiso para subir fotos
-- Corrige el error "no tiene permisos de administrador" al
-- guardar un destino con fotos nuevas.
-- Ejecutar UNA vez en: Supabase › SQL Editor › New query › Run
-- (No borra ni cambia ningún destino.)
-- =========================================================

drop policy if exists "fotos_storage_leer" on storage.objects;
create policy "fotos_storage_leer" on storage.objects for select to authenticated
  using (bucket_id = 'destinos' and public.es_admin());

-- Comprobar: deben aparecer 4 políticas fotos_storage_*
select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like 'fotos_storage_%'
order by policyname;
