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

-- 4. Preparar lineas de venta.
--    El volumen diario es de 35-80 tickets por sucursal, repartidos entre