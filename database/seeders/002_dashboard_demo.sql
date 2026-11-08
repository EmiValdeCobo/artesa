-- Datos demo del dashboard. Solo para desarrollo; no usar en producción.
-- Se puede ejecutar una vez con: pnpm db:seed (o node scripts/db.js seed).
-- Asegura un usuario y un turno disponibles para las ventas demo.
INSERT INTO seguridad.usuarios(id_rol, username, password_hash)
SELECT r.id_rol, 'cajero2', crypt('Cambiar123*', gen_salt('bf', 10))
FROM seguridad.roles r
WHERE r.nombre = 'CAJERO'
  AND NOT EXISTS (SELECT 1 FROM seguridad.usuarios WHERE username = 'cajero2');

INSERT INTO seguridad.usuario_sucursal(id_usuario, id_sucursal)
SELECT u.id_usuario, 2 FROM seguridad.usuarios u
WHERE u.username = 'cajero2'
  AND NOT EXISTS (SELECT 1 FROM seguridad.usuario_sucursal us WHERE us.id_usuario = u.id_usuario AND us.id_sucursal = 2);

INSERT INTO pos.turnos_caja(id_turno, id_caja, id_usuario, monto_apertura, abierto_en, estado)
SELECT gen_random_uuid(), c.id_caja, u.id_usuario, 50, now() - interval '8 hours', 'ABIERTO'
FROM pos.cajas c
JOIN seguridad.usuarios u ON u.username = CASE WHEN c.id_sucursal = 1 THEN 'cajero1' ELSE 'cajero2' END
WHERE NOT EXISTS (SELECT 1 FROM pos.turnos_caja t WHERE t.id_caja = c.id_caja AND t.estado = 'ABIERTO');

-- Una venta por sucursal y día durante los últimos 14 días; los productos se eligen del catálogo real.
WITH dias AS (
  SELECT generate_series(current_date - 13, current_date, interval '1 day')::date AS dia
), base AS (
  SELECT gen_random_uuid() AS id_venta, d.dia, c.id_sucursal,
         t.id_turno, u.id_usuario, p.id_producto, p.precio_venta,
         row_number() OVER () AS n
  FROM dias d
  CROSS JOIN pos.cajas c
  JOIN pos.turnos_caja t ON t.id_caja = c.id_caja AND t.estado = 'ABIERTO'
  JOIN seguridad.usuarios u ON u.id_usuario = t.id_usuario
  CROSS JOIN LATERAL (SELECT id_producto, precio_venta FROM inventario.productos WHERE activo ORDER BY random() LIMIT 1) p
)
INSERT INTO pos.ventas(id_venta, id_turno, id_sucursal, id_usuario, tipo_comprobante, correlativo,
                       numero_control, estado_dte, subtotal, descuento, iva, total, estado, fecha_emision)
SELECT b.id_venta, b.id_turno, b.id_sucursal, b.id_usuario, 'FCF', 'DASH-' || b.n,
       'DTE-DASH-' || b.n, 'ACEPTADO', round(b.precio_venta / 1.13, 2), 0,
       b.precio_venta - round(b.precio_venta / 1.13, 2), b.precio_venta, 'EMITIDA',
       (b.dia + time '10:00') AT TIME ZONE 'America/El_Salvador'
FROM base b
WHERE NOT EXISTS (SELECT 1 FROM pos.ventas v WHERE v.correlativo = 'DASH-' || b.n);

WITH ventas AS (
  SELECT v.id_venta, p.id_producto, v.total
  FROM pos.ventas v
  JOIN LATERAL (SELECT p.id_producto FROM inventario.productos p WHERE p.activo ORDER BY p.id_producto LIMIT 1) p ON true
  WHERE v.correlativo LIKE 'DASH-%'
)
INSERT INTO pos.venta_detalles(id_venta, id_producto, cantidad, precio_unitario, subtotal_linea)
SELECT v.id_venta, v.id_producto, 1, v.total, v.total FROM ventas v
WHERE NOT EXISTS (SELECT 1 FROM pos.venta_detalles d WHERE d.id_venta = v.id_venta);

-- Fuerza dos estados visibles en el panel de alertas.
UPDATE inventario.stock_sucursal ss
SET stock_actual = 0
WHERE ss.id_sucursal = 1
  AND ss.id_insumo = (SELECT min(id_insumo) FROM inventario.insumos WHERE activo);

UPDATE inventario.stock_sucursal ss
SET stock_actual = GREATEST(1, ss.stock_minimo / 2)
WHERE ss.id_sucursal = 1
  AND ss.id_insumo = (SELECT max(id_insumo) FROM inventario.insumos WHERE activo);

INSERT INTO pos.ordenes(id_turno, canal, etiqueta, estado, creado_en)
SELECT t.id_turno, 'MOSTRADOR', 'Pedido demo', 'EN_PREPARACION', now() - interval '30 minutes'
FROM pos.turnos_caja t
WHERE t.estado = 'ABIERTO'
  AND NOT EXISTS (SELECT 1 FROM pos.ordenes o WHERE o.etiqueta = 'Pedido demo');

ANALYZE pos.ventas;
ANALYZE pos.venta_detalles;
