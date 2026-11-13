-- ============================================================================
-- DATOS DEMO DEL DASHBOARD - RESTAURANTE ORIGENES SV
-- Genera aproximadamente 35-80 ventas por sucursal y por dia durante los
-- ultimos 4 meses (incluye hoy), con turnos, detalles y pagos.
-- Solo desarrollo / demostracion. NO ejecutar en produccion.
--
-- Ejecutar despues de:
--   1) init/01_schema.sql y migraciones correspondientes
--   2) 001_portales_demo.sql
--
-- Se puede volver a ejecutar: los correlativos sinteticos son deterministas
-- por sucursal, caja, fecha y numero de ticket.
-- ============================================================================

-- 1. Crear un cajero demo independiente por caja.
--    Asi no se rompe la regla de un solo turno ABIERTO por usuario.
INSERT INTO seguridad.usuarios(id_rol, username, password_hash)
SELECT r.id_rol,
       'dashboard_demo_caja_' || c.id_caja,
       crypt('Cambiar123*', gen_salt('bf', 10))
FROM seguridad.roles r
CROSS JOIN pos.cajas c
WHERE r.nombre = 'CAJERO'
  AND NOT EXISTS (
      SELECT 1
      FROM seguridad.usuarios u
      WHERE u.username = 'dashboard_demo_caja_' || c.id_caja
  );

-- Asignar cada cajero demo a la sucursal de su caja.
INSERT INTO seguridad.usuario_sucursal(id_usuario, id_sucursal)
SELECT u.id_usuario, c.id_sucursal
FROM pos.cajas c
JOIN seguridad.usuarios u
  ON u.username = 'dashboard_demo_caja_' || c.id_caja
WHERE NOT EXISTS (
    SELECT 1
    FROM seguridad.usuario_sucursal us
    WHERE us.id_usuario = u.id_usuario
      AND us.id_sucursal = c.id_sucursal
);

-- 2. Crear turnos historicos cerrados: desde hace 4 meses hasta ayer.
--    Se crea un turno por caja y por dia para el cajero demo de esa caja.
INSERT INTO pos.turnos_caja(
    id_turno, id_caja, id_usuario, monto_apertura,
    abierto_en, cerrado_en, estado
)
SELECT gen_random_uuid(),
       c.id_caja,
       u.id_usuario,
       50.00,
       d.dia::timestamp + time '07:00',
       d.dia::timestamp + time '22:30',
       'CERRADO'
FROM generate_series(
         (CURRENT_DATE - INTERVAL '4 months')::date,
         CURRENT_DATE - 1,
         INTERVAL '1 day'
     ) AS d(dia)
CROSS JOIN pos.cajas c
JOIN seguridad.usuarios u
  ON u.username = 'dashboard_demo_caja_' || c.id_caja
WHERE NOT EXISTS (
    SELECT 1
    FROM pos.turnos_caja t
    WHERE t.id_caja = c.id_caja
      AND t.id_usuario = u.id_usuario
      AND t.abierto_en::date = d.dia::date
      AND t.estado = 'CERRADO'
);

-- 3. Asegurar un turno abierto para hoy en cada caja que no tenga uno.
--    Si ya existe un turno abierto real/demo, se conserva.
INSERT INTO pos.turnos_caja(
    id_turno, id_caja, id_usuario, monto_apertura,
    abierto_en, estado
)
SELECT gen_random_uuid(),
       c.id_caja,
       u.id_usuario,
       50.00,
       CURRENT_TIMESTAMP - INTERVAL '8 hours',
       'ABIERTO'
FROM pos.cajas c
JOIN seguridad.usuarios u
  ON u.username = 'dashboard_demo_caja_' || c.id_caja
WHERE NOT EXISTS (
    SELECT 1
    FROM pos.turnos_caja t
    WHERE t.id_caja = c.id_caja
      AND t.estado = 'ABIERTO'
);

-- 4. Preparar lineas y tickets de venta en tablas temporales limpias.
DROP TABLE IF EXISTS pg_temp.tmp_dashboard_demo_items;
DROP TABLE IF EXISTS pg_temp.tmp_dashboard_demo_lineas;

CREATE TEMP TABLE tmp_dashboard_demo_lineas AS
WITH cajas_suc AS (
    SELECT c.id_caja, c.id_sucursal,
           ROW_NUMBER() OVER (PARTITION BY c.id_sucursal ORDER BY c.id_caja) AS rn,
           COUNT(*) OVER (PARTITION BY c.id_sucursal) AS cajas_en_suc
    FROM pos.cajas c
),
dias AS (
    SELECT d::date AS dia
    FROM generate_series(
             (CURRENT_DATE - INTERVAL '4 months')::date,
             CURRENT_DATE,
             INTERVAL '1 day'
         ) AS d
),
tickets_base AS (
    SELECT cs.id_caja, cs.id_sucursal, d.dia,
           CASE
               WHEN d.dia = CURRENT_DATE THEN
                   CASE cs.id_sucursal WHEN 1 THEN 40 ELSE 2 END
               ELSE
                   ROUND(
                       (28 + RANDOM() * 10
                        + CASE WHEN EXTRACT(ISODOW FROM d.dia) >= 5 THEN 18 ELSE 0 END)
                       * CASE cs.id_sucursal WHEN 1 THEN 1 ELSE 0.6 END
                       / cs.cajas_en_suc
                   )::int
           END AS n_tickets
    FROM cajas_suc cs
    CROSS JOIN dias d
),
lineas_raw AS (
    SELECT tb.id_caja, tb.id_sucursal, tb.dia,
           n AS ticket_num,
           'DASH-' || tb.id_sucursal || '-' || tb.id_caja || '-'
               || TO_CHAR(tb.dia, 'YYYYMMDD') || '-' || LPAD(n::text, 3, '0') AS correlativo,
           (time '08:00' + (RANDOM() * 11.5) * INTERVAL '1 hour') AS hora_relativa
    FROM tickets_base tb
    CROSS JOIN LATERAL generate_series(1, tb.n_tickets) AS n
)
SELECT gen_random_uuid() AS id_venta,
       lr.id_caja,
       lr.id_sucursal,
       lr.dia,
       lr.ticket_num,
       lr.correlativo,
       turno.id_turno,
       turno.id_usuario,
       lr.dia::timestamp + lr.hora_relativa AS fecha_emision
FROM lineas_raw lr
CROSS JOIN LATERAL (
    SELECT t.id_turno, t.id_usuario
    FROM pos.turnos_caja t
    WHERE t.id_caja = lr.id_caja
      AND (
          (lr.dia = CURRENT_DATE AND t.estado = 'ABIERTO')
          OR (lr.dia < CURRENT_DATE AND t.estado = 'CERRADO' AND t.abierto_en::date = lr.dia)
      )
    ORDER BY
        CASE WHEN t.id_usuario = (
            SELECT u.id_usuario
            FROM seguridad.usuarios u
            WHERE u.username = 'dashboard_demo_caja_' || lr.id_caja
        ) THEN 0 ELSE 1 END,
        t.abierto_en DESC
    LIMIT 1
) turno
WHERE NOT EXISTS (
    SELECT 1 FROM pos.ventas v WHERE v.correlativo = lr.correlativo
);

-- Preparar articulos de cada venta para sincronizar exactamente ventas y detalles.
CREATE TEMP TABLE tmp_dashboard_demo_items AS
SELECT l.id_venta,
       p.id_producto,
       (1 + FLOOR(RANDOM() * 3))::int AS cantidad,
       p.precio_venta AS precio_unitario
FROM tmp_dashboard_demo_lineas l
CROSS JOIN LATERAL (
    SELECT id_producto, precio_venta
    FROM inventario.productos
    WHERE activo
    ORDER BY RANDOM()
    LIMIT (1 + FLOOR(RANDOM() * 3))::int
) p;

-- 5. Insertar ventas con totales calculados desde los items reales.
INSERT INTO pos.ventas(
    id_venta, id_turno, id_sucursal, id_usuario,
    tipo_comprobante, correlativo, numero_control, estado_dte,
    subtotal, descuento, iva, total,
    estado, motivo_anulacion, anulada_por, anulada_en,
    fecha_emision
)
SELECT l.id_venta,
       l.id_turno,
       l.id_sucursal,
       l.id_usuario,
       'FCF',
       l.correlativo,
       'DTE-' || l.correlativo,
       'ACEPTADO',
       ROUND(tot.total / 1.13, 2) AS subtotal,
       0 AS descuento,
       tot.total - ROUND(tot.total / 1.13, 2) AS iva,
       tot.total,
       CASE WHEN anul.es_anulada THEN 'ANULADA' ELSE 'EMITIDA' END AS estado,
       CASE WHEN anul.es_anulada THEN 'Error de digitacion (demo)' END AS motivo_anulacion,
       CASE WHEN anul.es_anulada THEN l.id_usuario END AS anulada_por,
       CASE WHEN anul.es_anulada THEN l.fecha_emision END AS anulada_en,
       l.fecha_emision
FROM tmp_dashboard_demo_lineas l
JOIN (
    SELECT id_venta, SUM(cantidad * precio_unitario) AS total
    FROM tmp_dashboard_demo_items
    GROUP BY id_venta
) tot ON tot.id_venta = l.id_venta
CROSS JOIN LATERAL (
    SELECT (l.dia = CURRENT_DATE AND l.id_sucursal = 1 AND l.ticket_num <= 4)
        OR (l.dia < CURRENT_DATE AND RANDOM() < 0.04) AS es_anulada
) anul
WHERE NOT EXISTS (
    SELECT 1 FROM pos.ventas v WHERE v.correlativo = l.correlativo
);

-- 6. Insertar lineas de detalle para cada venta demo.
INSERT INTO pos.venta_detalles(id_venta, id_producto, cantidad, precio_unitario, subtotal_linea)
SELECT it.id_venta,
       it.id_producto,
       it.cantidad,
       it.precio_unitario,
       it.cantidad * it.precio_unitario
FROM tmp_dashboard_demo_items it
JOIN pos.ventas v ON v.id_venta = it.id_venta
WHERE NOT EXISTS (
    SELECT 1 FROM pos.venta_detalles d WHERE d.id_venta = it.id_venta
);

-- 7. Insertar pagos para cada venta demo que no tenga pagos aun.
--    Metodo de pago aleatorio: EFECTIVO, TARJETA, BITCOIN_CHIVO o TRANSFERENCIA.
INSERT INTO pos.pagos(id_venta, metodo, monto, monto_recibido, referencia)
SELECT v.id_venta,
       metodo_pago.metodo,
       v.total,
       CASE
           WHEN metodo_pago.metodo = 'EFECTIVO' THEN CEIL(v.total)
           ELSE v.total
       END,
       CASE
           WHEN metodo_pago.metodo = 'EFECTIVO' THEN NULL
           ELSE 'DEMO-' || SUBSTRING(REPLACE(v.id_venta::text, '-', ''), 1, 12)
       END
FROM (
    SELECT DISTINCT pv.id_venta, pv.total
    FROM pos.ventas pv
    JOIN tmp_dashboard_demo_lineas l
      ON l.correlativo = pv.correlativo
) v
CROSS JOIN LATERAL (
    SELECT CASE FLOOR(RANDOM() * 4)::int
               WHEN 0 THEN 'EFECTIVO'
               WHEN 1 THEN 'TARJETA'
               WHEN 2 THEN 'BITCOIN_CHIVO'
               ELSE 'TRANSFERENCIA'
           END AS metodo
) metodo_pago
WHERE NOT EXISTS (
    SELECT 1
    FROM pos.pagos pg
    WHERE pg.id_venta = v.id_venta
);

-- 8. Completar el cuadre de los turnos historicos demo usando los pagos reales
--    insertados arriba. Se deja diferencia cero para que el cuadre sea coherente.
WITH pagos_turno AS (
    SELECT v.id_turno,
           COALESCE(SUM(pg.monto) FILTER (WHERE pg.metodo = 'EFECTIVO'), 0) AS efectivo,
           COALESCE(SUM(pg.monto) FILTER (WHERE pg.metodo = 'TARJETA'), 0) AS tarjeta,
           COALESCE(SUM(pg.monto) FILTER (
               WHERE pg.metodo IN ('BITCOIN_CHIVO', 'TRANSFERENCIA')
           ), 0) AS digital
    FROM pos.ventas v
    JOIN pos.pagos pg ON pg.id_venta = v.id_venta
    GROUP BY v.id_turno
),
turnos_calculados AS (
    SELECT t.id_turno,
           t.monto_apertura + COALESCE(p.efectivo, 0) AS efectivo,
           COALESCE(p.tarjeta, 0) AS tarjeta,
           COALESCE(p.digital, 0) AS digital
    FROM pos.turnos_caja t
    JOIN seguridad.usuarios u ON u.id_usuario = t.id_usuario
    LEFT JOIN pagos_turno p ON p.id_turno = t.id_turno
    WHERE u.username LIKE 'dashboard_demo_caja_%'
      AND t.estado = 'CERRADO'
)
UPDATE pos.turnos_caja t
SET esperado_efectivo = tc.efectivo,
    esperado_tarjeta = tc.tarjeta,
    esperado_digital = tc.digital,
    monto_cierre_efectivo = tc.efectivo,
    monto_cierre_pos_tarjeta = tc.tarjeta,
    monto_cierre_digital = tc.digital,
    dif_efectivo = 0,
    dif_tarjeta = 0,
    dif_digital = 0
FROM turnos_calculados tc
WHERE t.id_turno = tc.id_turno;

-- 9. Mantener las alertas visibles del seeder original.
UPDATE inventario.stock_sucursal ss
SET stock_actual = 0
WHERE ss.id_sucursal = 1
  AND ss.id_insumo = (
      SELECT MIN(id_insumo)
      FROM inventario.insumos
      WHERE activo
  );

UPDATE inventario.stock_sucursal ss
SET stock_actual = GREATEST(1, ss.stock_minimo / 2)
WHERE ss.id_sucursal = 1
  AND ss.id_insumo = (
      SELECT MAX(id_insumo)
      FROM inventario.insumos
      WHERE activo
  );

-- 10. Mantener una orden demo activa para la pantalla de cocina.
INSERT INTO pos.ordenes(id_turno, canal, etiqueta, estado, creado_en)
SELECT t.id_turno,
       'MOSTRADOR',
       'Pedido demo',
       'EN_PREPARACION',
       CURRENT_TIMESTAMP - INTERVAL '30 minutes'
FROM pos.turnos_caja t
WHERE t.estado = 'ABIERTO'
  AND NOT EXISTS (
      SELECT 1
      FROM pos.ordenes o
      WHERE o.etiqueta = 'Pedido demo'
  );

DROP TABLE IF EXISTS pg_temp.tmp_dashboard_demo_items;
DROP TABLE IF EXISTS pg_temp.tmp_dashboard_demo_lineas;

ANALYZE pos.ventas;
ANALYZE pos.venta_detalles;
ANALYZE pos.pagos;
ANALYZE pos.turnos_caja;
