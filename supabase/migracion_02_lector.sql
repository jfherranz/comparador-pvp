-- Migración 02 · perfil "Solo lectura" (lector): ve todo, no modifica nada.
-- Ya aplicada en el proyecto en línea; esquema.sql incluye este cambio para proyectos nuevos.
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check check (rol in ('admin', 'precios', 'lector'));
-- Usuarios nuevos parten sin permiso de edición; el editor sube el perfil si corresponde.
alter table public.perfiles alter column rol set default 'lector';
-- precios_modificar ya exige rol admin o precios, así que lector no puede actualizar.
