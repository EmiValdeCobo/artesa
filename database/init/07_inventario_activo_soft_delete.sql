-- 07_inventario_activo_soft_delete.sql
-- Separa completamente la lógica de activo (habilitado/desactivado temporal) de deleted_at (borrado lógico).
-- Asegura columnas, reemplaza restricciones UNIQUE por índices únicos parciales (WHERE deleted_at IS NULL),
-- y actualiza funciones/vistas operativas para respetar deleted_at y activo.

-- 1. Asegurar existencia de columnas activo y deleted_at (idempotente)
ALTER TABLE inventario.insumos
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS modificado_en TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE inventario.productos
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS modificado_en TIMESTAMPTZ DEFAULT NULL;

-- 2. Índices únicos parciales para permitir reutilizar nombres de insumos y productos eliminados
ALTER TABLE inventario.insumos DROP CONSTRAINT IF EXISTS insumos_nombre_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_insumos_nombre_activos
  ON inventario.insumos(nombre)
  WHERE deleted_at IS NULL;

ALTER TABLE inventario.productos DROP CONSTRAINT IF EXISTS productos_nombre_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_productos_nombre_activos
  ON inventario.productos(nombre)
  WHERE deleted_at IS NULL;

ALTER TABLE inventario.productos DROP CONSTRAINT IF EXISTS productos_codigo_barra_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_productos_codigo_barra_activos
  ON inventario.productos(codigo_barra)
  WHERE deleted_at IS NULL AND codigo_barra IS NOT NULL;

-- 3. Actualizar pos.fn_registrar_venta para rechazar productos eliminados (deleted_at IS NOT NULL) o inactivos (activo = false)
CREATE OR REPLACE FUNCTION pos.fn_registrar_venta(
    p_id_turno UUID, p_tipo VARCHAR, p_id_cliente INT, p_items JSONB, p_pagos JSONB,
    p_descuento NUMERIC DEFAULT 0, p_id_orden INT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_turno pos.turnos_caja%ROWTYPE; v_suc INT;
    v_cli pos.clientes%ROWTYPE;
    v_tasa NUMERIC := empresa.fn_param('tasa_iva')::NUMERIC;
    v_n_items INT; v_n_validos INT;
    v_bruto NUMERIC; v_total NUMERIC; v_iva NUMERIC; v_sub NUMERIC; v_pagado NUMERIC;
    v_corr TEXT; v_ctrl TEXT; v_id UUID := gen_random_uuid();
    r RECORD;
BEGIN
    SELECT * INTO v_turno FROM pos.turnos_caja WHERE id_turno = p_id_turno;
    IF NOT FOUND OR v_turno.estado <> 'ABIERTO' THEN RAISE EXCEPTION 'El turno no existe o está cerrado'; END IF;
    SELECT id_sucursal INTO v_suc FROM pos.cajas WHERE id_caja = v_turno.id_caja;

    IF p_tipo = 'CCF' THEN
        SELECT * INTO v_cli FROM pos.clientes WHERE id_cliente = p_id_cliente;
        IF NOT FOUND OR v_cli.nrc IS NULL OR v_cli.giro_economico IS NULL THEN
            RAISE EXCEPTION 'Un CCF requiere cliente con NRC y giro económico';
        END IF;
    END IF;

    v_n_items := jsonb_array_length(p_items);
    IF v_n_items IS NULL OR v_n_items = 0 THEN RAISE EXCEPTION 'La venta no tiene productos'; END IF;

    -- El precio SIEMPRE se toma de la BD (no confiar en el precio que mande el frontend)
    -- Solo productos activos y no eliminados son aptos para la venta operativa
    SELECT COUNT(*), COALESCE(SUM(p.precio_venta * i.cantidad), 0) INTO v_n_validos, v_bruto
    FROM jsonb_to_recordset(p_items) AS i(id_producto INT, cantidad INT, nota TEXT)
    JOIN inventario.productos p ON p.id_producto = i.id_producto AND p.activo AND p.deleted_at IS NULL AND i.cantidad > 0;
    IF v_n_validos <> v_n_items THEN RAISE EXCEPTION 'Hay productos inexistentes, inactivos o con cantidad inválida'; END IF;

    IF p_descuento > v_bruto THEN RAISE EXCEPTION 'El descuento no puede superar el total'; END IF;
    v_total := ROUND(v_bruto - p_descuento, 2);
    v_iva   := ROUND(v_total - v_total / (1 + v_tasa), 2);
    v_sub   := v_total - v_iva;

    SELECT COALESCE(SUM(monto), 0) INTO v_pagado FROM jsonb_to_recordset(p_pagos) AS x(metodo TEXT, monto NUMERIC);
    IF ROUND(v_pagado, 2) <> v_total THEN RAISE EXCEPTION 'Los pagos (%) no cuadran con el total (%)', v_pagado, v_total; END IF;

    SELECT c.correlativo, c.numero_control INTO v_corr, v_ctrl FROM pos.fn_siguiente_correlativo(v_turno.id_caja, p_tipo) c;

    INSERT INTO pos.ventas(id_venta, id_turno, id_sucursal, id_usuario, id_cliente, id_orden, tipo_comprobante,
                           correlativo, numero_control, estado_dte, sello_recepcion, subtotal, descuento, iva, total)
    VALUES (v_id, p_id_turno, v_suc, v_turno.id_usuario, p_id_cliente, p_id_orden, p_tipo,
            v_corr, v_ctrl, 'ACEPTADO', 'SIMULADO-' || upper(substr(v_id::text, 1, 8)), v_sub, p_descuento, v_iva, v_total);

    INSERT INTO pos.venta_detalles(id_venta, id_producto, cantidad, precio_unitario, subtotal_linea, nota)
    SELECT v_id, p.id_producto, i.cantidad, p.precio_venta, p.precio_venta * i.cantidad, i.nota
    FROM jsonb_to_recordset(p_items) AS i(id_producto INT, cantidad INT, nota TEXT)
    JOIN inventario.productos p ON p.id_producto = i.id_producto;

    INSERT INTO pos.pagos(id_venta, metodo, monto, monto_recibido, referencia)
    SELECT v_id, x.metodo, x.monto, x.monto_recibido, x.referencia
    FROM jsonb_to_recordset(p_pagos) AS x(metodo TEXT, monto NUMERIC, monto_recibido NUMERIC, referencia TEXT);

    FOR r IN SELECT id_producto, cantidad FROM jsonb_to_recordset(p_items) AS i(id_producto INT, cantidad INT)
    LOOP
        PERFORM inventario.fn_descontar_stock_por_venta(v_suc, r.id_producto, r.cantidad, v_id, v_turno.id_usuario);
    END LOOP;

    IF p_id_orden IS NOT NULL THEN UPDATE pos.ordenes SET estado = 'FACTURADA' WHERE id_orden = p_id_orden; END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Actualizar vistas de reportes para respetar deleted_at
CREATE OR REPLACE VIEW reportes.vw_alertas_stock AS
SELECT s.nombre AS sucursal, i.nombre AS insumo, u.codigo AS unidad, ss.stock_actual, ss.stock_minimo,
       ss.stock_minimo - ss.stock_actual AS faltante,
       CASE WHEN ss.stock_actual <= 0 THEN 'AGOTADO' ELSE 'BAJO_MINIMO' END AS nivel
FROM inventario.stock_sucursal ss
JOIN empresa.sucursales s ON s.id_sucursal = ss.id_sucursal
JOIN inventario.insumos i ON i.id_insumo = ss.id_insumo
JOIN inventario.unidades_medida u ON u.id_unidad = i.id_unidad_base
WHERE i.activo AND i.deleted_at IS NULL AND ss.stock_actual <= ss.stock_minimo;

CREATE OR REPLACE VIEW reportes.vw_costo_margen_producto AS
SELECT p.id_producto, p.nombre, p.precio_venta,
       ROUND(p.precio_venta / (1 + empresa.fn_param('tasa_iva')::NUMERIC), 2) AS precio_sin_iva,
       ROUND(COALESCE(
            CASE WHEN p.es_elaborado THEN (SELECT SUM(r.cantidad_requerida * i.costo_promedio)
                                           FROM inventario.recetas r JOIN inventario.insumos i USING (id_insumo)
                                           WHERE r.id_producto = p.id_producto AND i.deleted_at IS NULL)
                 ELSE (SELECT costo_promedio FROM inventario.insumos WHERE id_insumo = p.id_insumo_reventa AND deleted_at IS NULL) END, 0), 2) AS costo_receta
FROM inventario.productos p
WHERE p.deleted_at IS NULL;
