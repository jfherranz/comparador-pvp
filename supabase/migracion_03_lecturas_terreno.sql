-- Lecturas propuestas de las fotos subidas desde terreno.
-- Las escribe la tarea nocturna del PC (con la clave secreta, que se salta RLS); el editor las revisa en la app y las borra al guardar o descartar.
create table if not exists public.lecturas_terreno (
  ruta text primary key,               -- terreno/<slug cadena>/<AAAA-MM-DD_hhmmss_id>.jpg en el bucket fotos
  cadena text not null,
  fecha date not null,
  nota text,
  precios jsonb not null default '[]', -- [{producto, marca, formato, pvpNormal, pvpOferta, obs, confianza}]
  creado timestamptz not null default now()
);
alter table public.lecturas_terreno enable row level security;
drop policy if exists lecturas_terreno_leer on public.lecturas_terreno;
create policy lecturas_terreno_leer on public.lecturas_terreno for select to authenticated using (public.mi_rol() = 'admin');
drop policy if exists lecturas_terreno_borrar on public.lecturas_terreno;
create policy lecturas_terreno_borrar on public.lecturas_terreno for delete to authenticated using (public.mi_rol() = 'admin');
-- Este proyecto no da permisos de tabla por defecto: hay que otorgarlos explícitamente (RLS sigue filtrando por rol).
grant select, delete on public.lecturas_terreno to authenticated;
grant all on public.lecturas_terreno to service_role;
