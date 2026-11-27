-- Comparador PVP Los Granos · esquema de Supabase
-- Pegar completo en Supabase → SQL Editor → Run (una sola vez, en un proyecto nuevo).
-- Roles:  admin   = editor (todo)
--         precios = jefatura / comercial (ve todo; solo modifica PVP normal y PVP oferta)
--         lector  = solo lectura (ve todo; no modifica nada)

-- ───────── Tablas ─────────
create table public.perfiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email   text not null,
  nombre  text,
  rol     text not null default 'lector' check (rol in ('admin', 'precios', 'lector')),
  creado  timestamptz not null default now()
);

create table public.maestros (
  tipo   text not null check (tipo in ('cadenas', 'productos', 'marcas')),
  nombre text not null,
  orden  int  not null default 0,
  primary key (tipo, nombre)
);

create table public.fotos (
  id     text primary key,
  cadena text not null,
  fecha  date not null,
  nombre text,              -- ruta original, ej. "El 9/WhatsApp Image ….jpeg"
  creado timestamptz not null default now()
);

create table public.precios (
  id              text primary key,
  fecha           date not null,
  cadena          text not null,
  sala            text,
  producto        text not null,
  marca           text not null,
  formato         int  not null check (formato > 0),        -- gramos
  pvp_normal      int  check (pvp_normal > 0),
  pvp_oferta      int  check (pvp_oferta > 0),               -- oferta, 2º precio o mayorista
  reponedor       text,
  obs             text,
  foto_id         text references public.fotos (id) on delete cascade,
  actualizado     timestamptz not null default now(),
  actualizado_por uuid default auth.uid()
);
create index precios_fecha_idx on public.precios (fecha);
create index precios_foto_idx on public.precios (foto_id);

-- ───────── Rol del usuario conectado ─────────
create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where user_id = auth.uid()
$$;

-- Cada usuario nuevo de Authentication recibe un perfil "lector" (solo lectura)
create or replace function public.nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (user_id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.nuevo_usuario();

-- "Editor precios" solo puede cambiar pvp_normal y pvp_oferta
create or replace function public.precios_control() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.mi_rol() is distinct from 'admin' then
    if (new.id, new.fecha, new.cadena, new.sala, new.producto, new.marca, new.formato, new.reponedor, new.obs, new.foto_id)
       is distinct from
       (old.id, old.fecha, old.cadena, old.sala, old.producto, old.marca, old.formato, old.reponedor, old.obs, old.foto_id) then
      raise exception 'Con tu perfil solo puedes modificar PVP normal y PVP oferta';
    end if;
  end if;
  new.actualizado := now();
  new.actualizado_por := auth.uid();
  return new;
end $$;
create trigger precios_antes_de_actualizar before update on public.precios
  for each row execute function public.precios_control();

-- ───────── Seguridad por fila ─────────
alter table public.perfiles enable row level security;
alter table public.maestros enable row level security;
alter table public.fotos    enable row level security;
alter table public.precios  enable row level security;

create policy perfiles_leer on public.perfiles for select to authenticated
  using (user_id = auth.uid() or public.mi_rol() = 'admin');

create policy maestros_leer on public.maestros for select to authenticated using (public.mi_rol() is not null);
create policy maestros_admin on public.maestros for all to authenticated
  using (public.mi_rol() = 'admin') with check (public.mi_rol() = 'admin');

create policy fotos_leer on public.fotos for select to authenticated using (public.mi_rol() is not null);
create policy fotos_admin on public.fotos for all to authenticated
  using (public.mi_rol() = 'admin') with check (public.mi_rol() = 'admin');

create policy precios_leer on public.precios for select to authenticated using (public.mi_rol() is not null);
create policy precios_crear on public.precios for insert to authenticated with check (public.mi_rol() = 'admin');
create policy precios_borrar on public.precios for delete to authenticated using (public.mi_rol() = 'admin');
create policy precios_modificar on public.precios for update to authenticated
  using (public.mi_rol() in ('admin', 'precios')) with check (public.mi_rol() in ('admin', 'precios'));

revoke all on public.perfiles, public.maestros, public.fotos, public.precios from anon;
grant select on public.perfiles to authenticated;
grant select, insert, update, delete on public.maestros, public.fotos, public.precios to authenticated;

-- ───────── Funciones del editor ─────────
-- Renombra un maestro y actualiza en cascada precios (y fotos si es cadena)
create or replace function public.renombrar_maestro(p_tipo text, p_viejo text, p_nuevo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() is distinct from 'admin' then raise exception 'Solo el editor'; end if;
  update public.maestros set nombre = p_nuevo where tipo = p_tipo and nombre = p_viejo;
  if p_tipo = 'cadenas' then
    update public.precios set cadena = p_nuevo where cadena = p_viejo;
    update public.fotos   set cadena = p_nuevo where cadena = p_viejo;
  elsif p_tipo = 'productos' then
    update public.precios set producto = p_nuevo where producto = p_viejo;
  elsif p_tipo = 'marcas' then
    update public.precios set marca = p_nuevo where marca = p_viejo;
  end if;
end $$;

-- Guarda el orden de una lista de maestros
create or replace function public.ordenar_maestros(p_tipo text, p_nombres text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() is distinct from 'admin' then raise exception 'Solo el editor'; end if;
  update public.maestros m set orden = x.i
    from unnest(p_nombres) with ordinality as x(nombre, i)
   where m.tipo = p_tipo and m.nombre = x.nombre;
end $$;

revoke execute on function public.renombrar_maestro, public.ordenar_maestros from anon, public;
grant execute on function public.renombrar_maestro, public.ordenar_maestros, public.mi_rol to authenticated;

-- ───────── Fotos (Storage) ─────────
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false) on conflict (id) do nothing;

create policy fotos_archivo_leer on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and public.mi_rol() is not null);
create policy fotos_archivo_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.mi_rol() = 'admin');
create policy fotos_archivo_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.mi_rol() = 'admin');
