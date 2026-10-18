-- =====================================================================
-- USUARIOS INICIALES (ejecutar DESPUÉS de 01_esquema.sql)
--
-- Paso 1: en Supabase > Authentication > Users > "Add user" > "Create new user"
--         crea dos usuarios con correo y contraseña (marca "Auto Confirm User").
-- Paso 2: cambia los correos de abajo por los que creaste y ejecuta este script.
-- =====================================================================

insert into perfiles (id, nombre, rol)
select id, 'Gerente General', 'gerente'::rol_usuario
from auth.users
where email = 'cardenasjairo00@gmail.com';

insert into perfiles (id, nombre, rol)
select id, 'Administrador', 'administrador'::rol_usuario
from auth.users
where email = 'moreno12@gmail.com';

insert into perfiles (id, nombre, rol)
select id, 'Recepcionista de prueba', 'recepcionista'::rol_usuario
from auth.users
where email = 'recepcionista@gmail.com';

insert into perfiles (id, nombre, rol)
select id, 'Gerente General', 'gerente'::rol_usuario
from auth.users
where email = 'gerente@gmail.com';

-- Verifica:
select p.nombre, p.rol, u.email from perfiles p join auth.users u on u.id = p.id;