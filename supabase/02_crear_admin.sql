-- =========================================================
-- Convertir un usuario en ADMINISTRADOR
--
-- Antes: Supabase › Authentication › Users › Add user › Create new user
--        (correo + contraseña, marca "Auto Confirm User").
-- Luego: cambia el correo de abajo y ejecuta esto en el SQL Editor.
-- =========================================================

insert into public.admins (user_id, email)
select id, email
from auth.users
where email = 'CAMBIA-ESTE-CORREO@ejemplo.com'
on conflict (user_id) do nothing;

-- Comprobar: debe aparecer el correo
select * from public.admins;

-- Para QUITAR un admin:
-- delete from public.admins where email = 'correo@ejemplo.com';
