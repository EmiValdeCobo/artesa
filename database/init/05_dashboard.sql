-- 005_dashboard.sql  Dashboard de negocio: permisos de alcance, parámetros de alertas e índices.
-- Idempotente (IF NOT EXISTS / ON CONFLICT DO NOTHING). No modifica 01_schema.sql.

-- ---------------------------------------------------------------------------
-- 1. Permisos nuevos. Ventas diarias ya cuelga de REP_VER_DASHBOARD (existente).
--    Las alertas NO tienen permiso propio: cada una exige el permiso del módulo al que pertenece
--    (INV_VER_STOCK, COM_VER_CXP, CAJA_VER_CUADRES, ...), así cada rol recibe solo lo de sus funciones.
-- ---------------------------------------------------------------------------
INSERT INTO seguridad.permisos(codigo, modulo, descripcion) VALUES
 ('DASH_VER_MIS_VENTAS',    'REPORTES', 'Ver en el inicio sus propias ventas (solo las que registró)'),
 ('DASH_VER_TOP_PRODUCTOS', 'REPORTES', 'Ver el ranking de productos más vendidos (unidades; los importes exigen REP_VER_DASHBOARD)'),
 ('DASH_TODAS_SUCURSALES',  'REPORTES', 'Ver el inicio con datos de todas las sucursales y no solo las asignadas')
ON CONFLICT (codigo) DO NOTHING;

-- Matriz por defecto de los roles semilla (el ADMIN puede cambiarla desde Roles y permisos).
INSERT INTO seguridad.roles_permisos(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM (VALUES
  ('ADMIN',            'DASH_VER_MIS_VENTAS'),
  ('ADMIN',            'DASH_VER_TOP_PRODUCTOS'),
  ('ADMIN',            'DASH_TODAS_SUCURSALES'),
  ('GERENTE_SUCURSAL', 'DASH_VER_TOP_PRODUCTOS'),
  ('CONTADOR',         'DASH_VER_TOP_PRODUCTOS'),
  ('CONTADOR',         'DASH_TODAS_SUCURSALES'),
  ('CAJERO',           'DASH_VER_MIS_VENTAS'),
  ('CAJERO',           'DASH_VER_TOP_PRODUCTOS'),
  ('BARISTA',          'DASH_VER_TOP_PRODUCTOS'),
  ('RRHH',             'DASH_TODAS_SUCURSALES')
) m(rol, permiso)
JOIN seguridad.roles r    ON r.nombre = m.rol
JOIN seguridad.permisos p ON p.codigo = m.permiso
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Parámetros editables (empresa.parametros). El backend aplica un valor por defecto si faltan.
-- ---------------------------------------------------------------------------
INSERT INTO empresa.parametros(clave, valor, descripcion) VALUES
 ('zona_horaria',                 'America/El_Salvador', 'Zona horaria del negocio: define qué es "hoy" al agrupar ventas por día'),
 ('dash_caida_ventas_pct',        '30', 'Alerta de caída: % por debajo del promedio del mismo día de la semana (últimas 4 semanas, mismo corte horario)'),
 ('dash_caida_ventas_hora_min',   '11', 'Hora local (0-23) desde la que se evalúa la caída de ventas del día'),
 ('dash_cxp_dias_aviso',          '3',  'Alerta de cuentas por pagar: días de anticipación antes del vencimiento'),
 ('dash_turno_horas_max',         '12', 'Alerta de turno de caja abierto por más de estas horas'),
 ('dash_anulaciones_max_dia',     '3',  'Alerta cuando las ventas anuladas del día alcanzan este número en una sucursal'),
 ('dash_preparacion_minutos_max', '15', 'Alerta de pedidos en preparación por más de estos minutos')
ON CONFLICT (clave) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Índices de apoyo. Los parciales y con INCLUDE permiten "index-only scan" en las agregaciones.
--    (venta_detalles.id_venta y pagos_proveedor.id_compra son FK sin índice: PostgreSQL no los crea solo.)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_ventas_emitidas_fecha
  ON pos.ventas (fecha_emision) INCLUDE (id_sucursal, id_usuario, subtotal, iva, total)
  WHERE estado = 'EMITIDA';
CREATE INDEX IF NOT EXISTS ix_ventas_usuario_fecha
  ON pos.ventas (id_usuario, fecha_emision) INCLUDE (total)
  WHERE estado = 'EMITIDA';
CREATE INDEX IF NOT EXISTS ix_ventas_anuladas_fecha
  ON pos.ventas (anulada_en) INCLUDE (id_sucursal, total)
  WHERE estado = 'ANULADA';
CREATE INDEX IF NOT EXISTS ix_venta_detalles_venta
  ON pos.venta_detalles (id_venta) INCLUDE (id_producto, cantidad, subtotal_linea);
CREATE INDEX IF NOT EXISTS ix_turnos_cerrados_fecha
  ON pos.turnos_caja (cerrado_en)
  WHERE estado = 'CERRADO';
CREATE INDEX IF NOT EXISTS ix_ordenes_en_preparacion
  ON pos.ordenes (creado_en)
  WHERE estado = 'EN_PREPARACION';
CREATE INDEX IF NOT EXISTS ix_facturas_compra_pendientes
  ON compras.facturas_compra (fecha_vencimiento) INCLUDE (id_sucursal, total)
  WHERE estado_pago <> 'PAGADO';
CREATE INDEX IF NOT EXISTS ix_pagos_proveedor_compra
  ON compras.pagos_proveedor (id_compra) INCLUDE (monto);
CREATE INDEX IF NOT EXISTS ix_planillas_pendientes
  ON rrhh.planillas (periodo_fin)
  WHERE NOT procesada;
