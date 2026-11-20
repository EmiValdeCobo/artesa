-- DEMO del dashboard: 30 días de ventas en las dos sucursales y un caso de cada alerta.
-- Ejecutar DESPUÉS del schema y de la migración 005, sobre una base de desarrollo (no en producción):
--   psql -d <base> -f database/demo/03_dashboard_demo.sql
-- Inserta directo en pos.ventas / pos.venta_detalles para poder fechar ventas en el pasado
-- (pos.fn_registrar_venta siempre usa la fecha actual). Son datos de prueba; no representan operación real.
\set ON_ERROR_STOP on
SELECT setseed(0.42);

-- ---------- Usuario de la sucursal 2 (sirve para comprobar que cajero1 no ve sus ventas) ----------
INSERT INTO seguridad.usuarios(id_rol, username, password_hash)
SELECT r.id_rol, 'cajero2', crypt('Cambiar123*', gen_salt('bf', 10)) FROM seguridad.roles r WHERE r.nombre = 'CAJERO'
ON CONFLICT (username) DO NOTHING;
INSERT INTO seguridad.usuario_sucursal(id_usuario, id_sucursal)
SELECT id_usuario, 2 FROM seguridad.usuarios WHERE username = 'cajero2'
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE t_zona AS SELECT 'America/El_Salvador'::text AS tz, (CURRENT_TIMESTAMP AT TIME ZONE 'America/El_Salvador') AS ahora;

-- ---------- Turnos: uno cerrado por caja y día (30 días) ----------
CREATE TEMP TABLE t_turnos AS
SELECT gen_random_uuid() AS id_turno, c.id_caja, c.id_sucursal, d::date AS dia,
       CASE c.id_sucursal WHEN 1 THEN 'cajero1' ELSE 'cajero2' END AS usuario
FROM pos.cajas c, generate_series((SELECT ahora::date FROM t_zona) - 30, (SELECT ahora::date FROM t_zona) - 1, interval '1 day') d;

INSERT INTO pos.turnos_caja(id_turno, id_caja, id_usuario, monto_apertura, monto_cierre_efectivo, monto_cierre_pos_tarjeta, monto_cierre_digital,
                            esperado_efectivo, esperado_tarjeta, esperado_digital, dif_efectivo, dif_tarjeta, dif_digital, abierto_en, cerrado_en, estado)
SELECT t.id_turno, t.id_caja, u.id_usuario, 50, 100, 0, 0, 100, 0, 0,
       CASE WHEN random() < 0.12 THEN -round((1 + random() * 4)::numeric, 2) ELSE 0 END, 0, 0,
       ((t.dia + time '07:30') AT TIME ZONE z.tz) AT TIME ZONE 'UTC',
       ((t.dia + time '21:00') AT TIME ZONE z.tz) AT TIME ZONE 'UTC', 'CERRADO'
FROM t_turnos t JOIN seguridad.usuarios u ON u.username = t.usuario CROSS JOIN t_zona z;

-- Turnos abiertos: caja 1 desde esta mañana (normal) y caja 2 desde ayer (olvidado abierto).
INSERT INTO pos.turnos_caja(id_turno, id_caja, id_usuario, monto_apertura, abierto_en, estado)
SELECT gen_random_uuid(), 1, (SELECT id_usuario FROM seguridad.usuarios WHERE username = 'cajero1'), 50,
       ((z.ahora::date + time '07:30') AT TIME ZONE z.tz) AT TIME ZONE 'UTC', 'ABIERTO' FROM t_zona z;
INSERT INTO pos.turnos_caja(id_turno, id_caja, id_usuario, monto_apertura, abierto_en, estado)
SELECT gen_random_uuid(), 2, (SELECT id_usuario FROM seguridad.usuarios WHERE username = 'cajero2'), 50,
       (((z.ahora::date - 1) + time '07:00') AT TIME ZONE z.tz) AT TIME ZONE 'UTC', 'ABIERTO' FROM t_zona z;

-- ---------- Tickets: más volumen en fin de semana; la sucursal 2 vende ~60 % de la 1 ----------
-- Hoy solo hasta la hora actual; la sucursal 2 hoy casi no vende (dispara la alerta de caída).
CREATE TEMP TABLE t_tickets AS
SELECT gen_random_uuid() AS id_venta, s.id_sucursal, d.dia::date AS dia, n,
       (time '08:00' + (random() * 11.5) * interval '1 hour') AS hora, row_number() OVER () AS k
FROM (VALUES (1), (2)) s(id_sucursal)
CROSS JOIN LATERAL generate_series((SELECT ahora::date FROM t_zona) - 30, (SELECT ahora::date FROM t_zona), interval '1 day') AS d(dia)
CROSS JOIN LATERAL generate_series(1, CASE
    WHEN d.dia::date = (SELECT ahora::date FROM t_zona) THEN CASE s.id_sucursal WHEN 1 THEN 40 ELSE 2 END
    ELSE (round((28 + random() * 10 + CASE WHEN extract(isodow FROM d.dia) >= 5 THEN 18 ELSE 0 END) * CASE s.id_sucursal WHEN 1 THEN 1 ELSE 0.6 END))::int
  END) AS n;

DELETE FROM t_tickets t USING t_zona z
WHERE t.dia::date = z.ahora::date AND t.hora > z.ahora::time;

CREATE TEMP TABLE t_items AS
SELECT t.id_venta, p.id_producto, p.precio_venta AS precio, (1 + floor(random() * 3))::int AS cant
FROM t_tickets t
CROSS JOIN LATERAL (
  SELECT id_producto, precio_venta FROM inventario.productos WHERE activo
  ORDER BY random() * (1 + id_producto % 6) + 0 * length(t.id_venta::text) LIMIT (1 + floor(random() * 3))::int
) p;

INSERT INTO pos.ventas(id_venta, id_turno, id_sucursal, id_usuario, tipo_comprobante, correlativo, numero_control, estado_dte,
                       subtotal, descuento, iva, total, estado, motivo_anulacion, anulada_por, anulada_en, fecha_emision)
SELECT t.id_venta,
       COALESCE(tt.id_turno, (SELECT x.id_turno FROM pos.turnos_caja x JOIN pos.cajas c USING (id_caja) WHERE x.estado = 'ABIERTO' AND c.id_sucursal = t.id_sucursal)),
       t.id_sucursal,
       CASE WHEN t.id_sucursal = 1 AND t.k % 10 < 3 THEN (SELECT id_usuario FROM seguridad.usuarios WHERE username = 'gerente1')
            WHEN t.id_sucursal = 1 THEN (SELECT id_usuario FROM seguridad.usuarios WHERE username = 'cajero1')
            ELSE (SELECT id_usuario FROM seguridad.usuarios WHERE username = 'cajero2') END,
       'FCF', 'DEMO-' || t.k, 'DTE-DEMO-' || t.k, 'ACEPTADO',
       round(i.total / 1.13, 2), 0, i.total - round(i.total / 1.13, 2), i.total,
       CASE WHEN anul THEN 'ANULADA' ELSE 'EMITIDA' END,
       CASE WHEN anul THEN 'Error de digitación (demo)' END,
       CASE WHEN anul THEN (SELECT id_usuario FROM seguridad.usuarios WHERE username = 'admin') END,
       CASE WHEN anul THEN ((t.dia + t.hora) AT TIME ZONE z.tz) AT TIME ZONE 'UTC' END,
       ((t.dia + t.hora) AT TIME ZONE z.tz) AT TIME ZONE 'UTC'
FROM t_tickets t
CROSS JOIN t_zona z
CROSS JOIN LATERAL (SELECT SUM(precio * cant) AS total FROM t_items WHERE id_venta = t.id_venta) i
CROSS JOIN LATERAL (SELECT (t.dia::date = z.ahora::date AND t.id_sucursal = 1 AND t.n <= 4) OR (t.dia::date < z.ahora::date AND random() < 0.04) AS anul) a
LEFT JOIN t_turnos tt ON tt.id_sucursal = t.id_sucursal AND tt.dia = t.dia::date;

INSERT INTO pos.venta_detalles(id_venta, id_producto, cantidad, precio_unitario, subtotal_linea)
SELECT id_venta, id_producto, cant, precio, precio * cant FROM t_items;

-- ---------- Escenarios de alerta ----------
-- Inventario: un insumo agotado y otro bajo el mínimo en la sucursal 1.
UPDATE inventario.stock_sucursal SET stock_actual = 0
 WHERE id_sucursal = 1 AND id_insumo = (SELECT id_insumo FROM inventario.insumos WHERE nombre = 'Leche Entera');
UPDATE inventario.stock_sucursal SET stock_actual = stock_minimo / 2
 WHERE id_sucursal = 1 AND id_insumo = (SELECT id_insumo FROM inventario.insumos WHERE nombre = 'Vaso 16oz');

-- Compras: una factura vencida, otra por vencer y una pagada.
INSERT INTO compras.facturas_compra(id_proveedor, id_sucursal, num_factura, tipo_costo, fecha_emision, condicion_pago, fecha_vencimiento, subtotal, iva_credito, total, estado_pago)
SELECT (SELECT min(id_proveedor) FROM compras.proveedores), 1, v.num, 'COSTO', z.ahora::date + v.emi, 'CREDITO', z.ahora::date + v.ven, v.sub, round(v.sub * 0.13, 2), v.sub + round(v.sub * 0.13, 2), v.estado
FROM t_zona z, (VALUES ('DEMO-F-001', -40, -5, 400.00, 'PENDIENTE'), ('DEMO-F-002', -28, 2, 250.00, 'PENDIENTE'), ('DEMO-F-003', -30, -2, 120.00, 'PAGADO')) v(num, emi, ven, sub, estado)
ON CONFLICT DO NOTHING;
INSERT INTO compras.pagos_proveedor(id_compra, monto, metodo)
SELECT id_compra, 100.00, 'TRANSFERENCIA' FROM compras.facturas_compra WHERE num_factura = 'DEMO-F-001'
UNION ALL SELECT id_compra, total, 'TRANSFERENCIA' FROM compras.facturas_compra WHERE num_factura = 'DEMO-F-003';

-- RR. HH.: planilla mensual sin procesar.
INSERT INTO rrhh.planillas(id_sucursal, periodo_inicio, periodo_fin, tipo_periodo, procesada)
SELECT 1, date_trunc('month', z.ahora)::date,
  (date_trunc('month', z.ahora) + interval '1 month - 1 day')::date, 'MENSUAL', FALSE FROM t_zona z
ON CONFLICT DO NOTHING;

-- Preparación: dos pedidos con más de 25 minutos en barra.
INSERT INTO pos.ordenes(id_turno, canal, etiqueta, estado, creado_en)
SELECT (SELECT t.id_turno FROM pos.turnos_caja t WHERE t.estado = 'ABIERTO' AND t.id_caja = 1), 'MOSTRADOR', v.e, 'EN_PREPARACION',
       (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - interval '25 minutes'
FROM (VALUES ('María (demo)'), ('Carlos (demo)')) v(e);

ANALYZE pos.ventas; ANALYZE pos.venta_detalles;
SELECT (SELECT count(*) FROM pos.ventas WHERE correlativo LIKE 'DEMO-%') AS ventas_demo,
       (SELECT count(*) FROM pos.venta_detalles d JOIN pos.ventas v USING (id_venta) WHERE v.correlativo LIKE 'DEMO-%') AS lineas_demo;
