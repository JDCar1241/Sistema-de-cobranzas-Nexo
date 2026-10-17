-- =====================================================================
-- SISTEMA DE COBRANZAS Y PRÉSTAMOS - Esquema Supabase (PostgreSQL)
-- Ejecutar completo en: Supabase > SQL Editor
-- Solo el personal de la empresa tiene cuenta. Los clientes son registros.
-- =====================================================================

-- ---------- TIPOS ----------
create type rol_usuario        as enum ('administrador', 'asesor', 'cobranzas', 'gerente');
create type tipo_cliente       as enum ('natural', 'juridica');
create type estado_prestamo    as enum ('activo', 'cancelado');   -- "vencido" se calcula (ver v_prestamos)
create type metodo_pago        as enum ('tarjeta', 'yape', 'efectivo');
create type medio_notificacion as enum ('whatsapp', 'llamada', 'sms', 'correo', 'presencial');

-- ---------- UTILIDADES ----------
-- Fecha de hoy en Lima (el servidor trabaja en UTC)
create or replace function hoy() returns date
language sql stable as $$ select (now() at time zone 'America/Lima')::date $$;

-- ---------- CONFIGURACIÓN ----------
create table configuracion (
  clave       text primary key,
  valor       numeric not null,
  descripcion text
);
insert into configuracion (clave, valor, descripcion) values
  ('tasa_interes_pct',     30,    'Interés total aplicado al monto prestado (%)'),
  ('tope_capital_cliente', 10000, 'Capital activo máximo por cliente (S/)');

-- ---------- PERFILES (personal con acceso) ----------
create table perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null,
  rol        rol_usuario not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Rol del usuario autenticado (null si no tiene perfil o está inactivo)
create or replace function rol_actual() returns rol_usuario
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid() and activo
$$;

create or replace function exigir_rol(variadic roles text[]) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if rol_actual() is null or not (rol_actual()::text = any(roles)) then
    raise exception 'No autorizado para esta operación' using errcode = '42501';
  end if;
end $$;

-- ---------- REPRESENTANTES LEGALES ----------
create table representantes (
  id         uuid primary key default gen_random_uuid(),
  dni        text not null unique check (dni ~ '^[0-9]{8}$'),
  nombres    text not null,
  apellidos  text not null,
  created_at timestamptz not null default now()
);

-- ---------- CLIENTES ----------
create table clientes (
  id             uuid primary key default gen_random_uuid(),
  tipo           tipo_cliente not null,
  -- persona natural
  dni            text unique check (dni ~ '^[0-9]{8}$'),
  nombres        text,
  apellidos      text,
  -- persona jurídica
  ruc            text unique check (ruc ~ '^20[0-9]{9}$'),
  razon_social   text,
  representante_id uuid references representantes(id),
  -- contacto
  telefono       text,
  correo         text,
  direccion      text,
  nombre_mostrar text generated always as
                   (coalesce(razon_social, apellidos || ' ' || nombres)) stored,
  created_by     uuid references perfiles(id) default auth.uid(),
  created_at     timestamptz not null default now(),

  constraint cliente_natural_ok check (
    tipo <> 'natural' or (
      dni is not null and nombres is not null and apellidos is not null
      and ruc is null and razon_social is null and representante_id is null)),
  constraint cliente_juridica_ok check (
    tipo <> 'juridica' or (
      ruc is not null and razon_social is not null and representante_id is not null
      and dni is null and nombres is null and apellidos is null))
);
create index clientes_nombre_idx on clientes (nombre_mostrar);

-- ---------- PRÉSTAMOS ----------
create sequence prestamos_seq;
create table prestamos (
  id                uuid primary key default gen_random_uuid(),
  codigo            text not null unique
                      default ('PR-' || lpad(nextval('prestamos_seq')::text, 6, '0')),
  cliente_id        uuid not null references clientes(id),
  monto_capital     numeric(12,2) not null check (monto_capital > 0),
  tasa_interes_pct  numeric(5,2)  not null,
  monto_interes     numeric(12,2) not null,
  total_a_pagar     numeric(12,2) not null,
  plazo_meses       int not null check (plazo_meses between 1 and 60),
  fecha_otorgamiento date not null,
  saldo_pendiente   numeric(12,2) not null check (saldo_pendiente >= 0),
  estado            estado_prestamo not null default 'activo',
  created_by        uuid references perfiles(id) default auth.uid(),
  created_at        timestamptz not null default now()
);
create index prestamos_cliente_idx on prestamos (cliente_id);

-- ---------- CUOTAS (cronograma) ----------
create table cuotas (
  id                uuid primary key default gen_random_uuid(),
  prestamo_id       uuid not null references prestamos(id),
  numero            int not null,
  fecha_vencimiento date not null,
  monto             numeric(12,2) not null check (monto > 0),
  monto_pagado      numeric(12,2) not null default 0,
  saldo             numeric(12,2) generated always as (monto - monto_pagado) stored,
  unique (prestamo_id, numero),
  check (monto_pagado >= 0 and monto_pagado <= monto)
);
create index cuotas_prestamo_idx on cuotas (prestamo_id);

-- ---------- PAGOS (inmutables) ----------
create sequence pagos_seq;
create table pagos (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique
                    default ('PG-' || lpad(nextval('pagos_seq')::text, 6, '0')),
  cuota_id        uuid not null references cuotas(id),
  prestamo_id     uuid not null references prestamos(id),
  importe         numeric(12,2) not null check (importe > 0),
  fecha_pago      date not null,
  metodo          metodo_pago not null,
  saldo_cuota     numeric(12,2) not null,      -- saldo de la cuota tras este pago
  saldo_prestamo  numeric(12,2) not null,      -- saldo del préstamo tras este pago
  registrado_por  uuid references perfiles(id) default auth.uid(),
  created_at      timestamptz not null default now()
);
create index pagos_prestamo_idx on pagos (prestamo_id);
create index pagos_fecha_idx    on pagos (fecha_pago);

create or replace function bloquear_modificacion() returns trigger
language plpgsql as $$
begin
  raise exception 'Los pagos no se pueden modificar ni eliminar';
end $$;
create trigger pagos_inmutables before update or delete on pagos
  for each row execute function bloquear_modificacion();

-- ---------- NOTIFICACIONES (registro manual del cobrador) ----------
create table notificaciones (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references clientes(id),
  prestamo_id    uuid references prestamos(id),
  medio          medio_notificacion not null,
  comentario     text,
  fecha_contacto timestamptz not null default now(),
  registrado_por uuid references perfiles(id) default auth.uid()
);
create index notificaciones_cliente_idx on notificaciones (cliente_id);

-- =====================================================================
-- FUNCIONES DE NEGOCIO (se llaman con supabase.rpc)
-- =====================================================================

-- HU03: crea el préstamo y genera su cronograma automáticamente
create or replace function crear_prestamo(
  p_cliente_id uuid, p_monto numeric, p_fecha date, p_plazo int
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_tasa numeric; v_tope numeric; v_activo numeric;
  v_interes numeric; v_total numeric; v_cuota numeric; v_id uuid; i int;
begin
  perform exigir_rol('administrador', 'asesor');

  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor que cero';
  end if;
  if p_plazo is null or p_plazo < 1 or p_plazo > 60 then
    raise exception 'El plazo debe estar entre 1 y 60 meses';
  end if;
  if p_fecha is null then
    raise exception 'La fecha de otorgamiento es obligatoria';
  end if;

  select valor into v_tasa from configuracion where clave = 'tasa_interes_pct';
  select valor into v_tope from configuracion where clave = 'tope_capital_cliente';

  -- bloquea al cliente para evitar dos préstamos simultáneos que superen el tope
  perform 1 from clientes where id = p_cliente_id for update;
  if not found then raise exception 'El cliente no existe'; end if;

  select coalesce(sum(monto_capital), 0) into v_activo
    from prestamos where cliente_id = p_cliente_id and estado = 'activo';

  if v_activo + p_monto > v_tope then
    raise exception 'Supera el tope de S/ % por cliente. Capital activo: S/ %. Disponible: S/ %',
      v_tope, v_activo, v_tope - v_activo;
  end if;

  v_interes := round(p_monto * v_tasa / 100, 2);
  v_total   := p_monto + v_interes;
  v_cuota   := round(v_total / p_plazo, 2);

  insert into prestamos (cliente_id, monto_capital, tasa_interes_pct, monto_interes,
                         total_a_pagar, plazo_meses, fecha_otorgamiento, saldo_pendiente)
  values (p_cliente_id, p_monto, v_tasa, v_interes, v_total, p_plazo, p_fecha, v_total)
  returning id into v_id;

  for i in 1..p_plazo loop
    insert into cuotas (prestamo_id, numero, fecha_vencimiento, monto)
    values (
      v_id, i,
      (p_fecha + make_interval(months => i))::date,
      -- la última cuota absorbe el redondeo
      case when i = p_plazo then v_total - v_cuota * (p_plazo - 1) else v_cuota end
    );
  end loop;

  return v_id;
end $$;

-- HU07: registra un pago total o parcial de la cuota más antigua pendiente
create or replace function registrar_pago(
  p_cuota_id uuid, p_importe numeric, p_fecha date, p_metodo metodo_pago
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_c cuotas%rowtype; v_p prestamos%rowtype; v_antigua uuid;
  v_saldo_cuota numeric; v_saldo_prestamo numeric; v_pago_id uuid;
begin
  perform exigir_rol('administrador', 'cobranzas');

  if p_importe is null or p_importe <= 0 then
    raise exception 'El importe debe ser mayor que cero';
  end if;
  if p_fecha is null or p_metodo is null then
    raise exception 'La fecha y el método de pago son obligatorios';
  end if;
  if p_fecha > hoy() then
    raise exception 'La fecha de pago no puede ser futura';
  end if;

  select * into v_c from cuotas where id = p_cuota_id for update;
  if not found then raise exception 'La cuota no existe'; end if;

  select * into v_p from prestamos where id = v_c.prestamo_id for update;
  if v_p.estado = 'cancelado' then raise exception 'El préstamo ya está cancelado'; end if;
  if v_c.saldo <= 0 then raise exception 'La cuota ya está pagada'; end if;

  select id into v_antigua from cuotas
   where prestamo_id = v_c.prestamo_id and saldo > 0
   order by numero limit 1;
  if v_antigua <> v_c.id then
    raise exception 'Debe pagarse primero la cuota más antigua pendiente';
  end if;

  if p_importe > v_c.saldo then
    raise exception 'El importe supera el saldo de la cuota (S/ %)', v_c.saldo;
  end if;

  v_saldo_cuota    := v_c.saldo - p_importe;
  v_saldo_prestamo := v_p.saldo_pendiente - p_importe;

  update cuotas set monto_pagado = monto_pagado + p_importe where id = v_c.id;

  update prestamos
     set saldo_pendiente = v_saldo_prestamo,
         estado = case when v_saldo_prestamo <= 0
                       then 'cancelado'::estado_prestamo else estado end
   where id = v_p.id;

  insert into pagos (cuota_id, prestamo_id, importe, fecha_pago, metodo,
                     saldo_cuota, saldo_prestamo)
  values (v_c.id, v_p.id, p_importe, p_fecha, p_metodo, v_saldo_cuota, v_saldo_prestamo)
  returning id into v_pago_id;

  return v_pago_id;
end $$;

revoke all on function crear_prestamo(uuid, numeric, date, int)          from public, anon;
revoke all on function registrar_pago(uuid, numeric, date, metodo_pago)  from public, anon;
grant execute on function crear_prestamo(uuid, numeric, date, int)         to authenticated;
grant execute on function registrar_pago(uuid, numeric, date, metodo_pago) to authenticated;

-- =====================================================================
-- VISTAS (respetan RLS del usuario que consulta)
-- =====================================================================

-- HU04/HU05: préstamos con estado calculado vigente / vencido / cancelado
create view v_prestamos with (security_invoker = true) as
select
  p.*,
  c.nombre_mostrar as cliente,
  case
    when p.estado = 'cancelado' then 'cancelado'
    when exists (select 1 from cuotas q
                  where q.prestamo_id = p.id and q.saldo > 0
                    and q.fecha_vencimiento < hoy()) then 'vencido'
    else 'vigente'
  end as estado_actual,
  (select count(*) from cuotas q
    where q.prestamo_id = p.id and q.saldo > 0
      and q.fecha_vencimiento < hoy())                       as cuotas_vencidas,
  (select coalesce(sum(q.saldo), 0) from cuotas q
    where q.prestamo_id = p.id and q.saldo > 0
      and q.fecha_vencimiento < hoy())                       as saldo_vencido,
  (select min(q.fecha_vencimiento) from cuotas q
    where q.prestamo_id = p.id and q.saldo > 0)              as primer_vencimiento_pendiente
from prestamos p
join clientes c on c.id = p.cliente_id;

-- HU10: bandeja de cobranza (préstamos vencidos con datos de contacto)
create view v_cobranza with (security_invoker = true) as
select
  v.id as prestamo_id, v.codigo, v.cliente_id, v.cliente,
  c.telefono, c.correo, c.direccion,
  v.cuotas_vencidas, v.saldo_vencido, v.saldo_pendiente,
  v.primer_vencimiento_pendiente,
  (select max(n.fecha_contacto) from notificaciones n
    where n.cliente_id = v.cliente_id) as ultima_notificacion
from v_prestamos v
join clientes c on c.id = v.cliente_id
where v.estado_actual = 'vencido';

-- HU11: indicadores de gerencia
create view v_indicadores with (security_invoker = true) as
select
  count(*)                                              as total_prestamos,
  coalesce(sum(monto_capital), 0)                       as monto_total_prestado,
  coalesce(sum(saldo_pendiente), 0)                     as saldo_total_pendiente,
  count(*) filter (where estado_actual = 'vigente')     as prestamos_vigentes,
  count(*) filter (where estado_actual = 'vencido')     as prestamos_vencidos,
  count(*) filter (where estado_actual = 'cancelado')   as prestamos_cancelados
from v_prestamos;

-- =====================================================================
-- SEGURIDAD (Row Level Security)
-- Lectura: cualquier personal activo. Escritura: según rol.
-- prestamos, cuotas y pagos NO tienen políticas de escritura:
-- solo se modifican con crear_prestamo() y registrar_pago().
-- =====================================================================
alter table configuracion  enable row level security;
alter table perfiles       enable row level security;
alter table representantes enable row level security;
alter table clientes       enable row level security;
alter table prestamos      enable row level security;
alter table cuotas         enable row level security;
alter table pagos          enable row level security;
alter table notificaciones enable row level security;

create policy cfg_select on configuracion for select to authenticated
  using (rol_actual() is not null);
create policy cfg_update on configuracion for update to authenticated
  using (rol_actual() = 'administrador') with check (rol_actual() = 'administrador');

create policy perfiles_select on perfiles for select to authenticated
  using (id = auth.uid() or rol_actual() = 'administrador');
create policy perfiles_update on perfiles for update to authenticated
  using (rol_actual() = 'administrador') with check (rol_actual() = 'administrador');

create policy repr_select on representantes for select to authenticated
  using (rol_actual() is not null);
create policy repr_insert on representantes for insert to authenticated
  with check (rol_actual() in ('administrador', 'asesor'));
create policy repr_update on representantes for update to authenticated
  using (rol_actual() in ('administrador', 'asesor'))
  with check (rol_actual() in ('administrador', 'asesor'));

create policy cli_select on clientes for select to authenticated
  using (rol_actual() is not null);
create policy cli_insert on clientes for insert to authenticated
  with check (rol_actual() in ('administrador', 'asesor'));
create policy cli_update on clientes for update to authenticated
  using (rol_actual() in ('administrador', 'asesor'))
  with check (rol_actual() in ('administrador', 'asesor'));

create policy pre_select on prestamos for select to authenticated
  using (rol_actual() is not null);
create policy cuo_select on cuotas for select to authenticated
  using (rol_actual() is not null);
create policy pag_select on pagos for select to authenticated
  using (rol_actual() is not null);

create policy not_select on notificaciones for select to authenticated
  using (rol_actual() is not null);
create policy not_insert on notificaciones for insert to authenticated
  with check (rol_actual() in ('administrador', 'cobranzas'));
  
create type rol_usuario as enum ('administrador', 'asesor', 'recepcionista', 'cobranzas', 'gerente');