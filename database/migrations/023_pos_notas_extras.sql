-- 023_pos_notas_extras.sql
-- Extras (complementos) por producto: "+ queso", "+ shot de espresso".
-- Decisión: un extra ES un producto (precio con IVA, receta/stock propios) marcado con es_extra; así
-- pos.fn_registrar_venta cobra, calcula IVA y descuenta stock sin lógica nueva. Solo se agrega:
--   * qué extras admite cada producto (inventario.producto_extras),
--   * a qué línea pertenece cada extra (id_detalle_padre en orden_detalles y venta_detalles).
-- Las observaciones ("sin mayonesa") ya existían como columna nota; no alteran el inventario.

-- 1) Catálogo de extras
ALTER TABLE inventario.productos ADD COLUMN IF NOT EXISTS es_extra BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS inventario.producto_extras (
    id_producto INT NOT NULL REFERENCES inventario.productos(id_producto) ON DELETE CASCADE,
    id_extra    INT NOT NULL REFERENCES inventario.productos(id_producto) ON DELETE CASCADE,
    PRIMARY KEY (id_producto, id_extra),
    CONSTRAINT ck_producto_extra_distinto CHECK (id_producto <> id_extra)
);
CREATE INDEX IF NOT EXISTS ix_producto_extras_extra ON inventario.producto_extras (id_extra);

-- 2) Línea padre: el extra se muestra agrupado bajo su producto en ticket, historial y cola.
ALTER TABLE pos.orden_detalles ADD COLUMN IF NOT EXISTS id_detalle_padre INT
    REFERENCES pos.orden_detalles(id_detalle) ON DELETE CASCADE;
ALTER TABLE pos.venta_detalles ADD COLUMN IF NOT EXISTS id_detalle_padre INT
    REFERENCES pos.venta_detalles(id_detalle) ON DELETE CASCADE;

-- (jsonb_to_recordset no admite WITH ORDINALITY con lista de columnas: se usa jsonb_array_elements.)
-- 3) Registrar venta: items=[{id_producto, cantidad, nota, extra_de}] donde extra_de es la posición
--    (1-based) en p_items de la línea principal. Reglas validadas en la BD:
--    un extra va DESPUÉS de su línea, la línea padre no es a su vez extra, el extra está permitido para
--    ese producto y un producto es_extra no se vende suelto.
CREATE OR REPLACE FUNCTION pos.fn_registrar_venta(
    p_id_turno UUID, p_tipo VARCHAR, p_id_cliente INT, p_items JSONB, p_pagos JSONB,
    p_descuento NUMERIC DEFAULT 0, p_id_orden INT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_turno pos.turnos_caja%ROWTYPE; v_suc INT;
    v_cli pos.clientes%ROWTYPE;
    v_ord RECORD;
    v_tasa NUMERIC := empresa.fn_param('tasa_iva')::NUMERIC;
    v_n_items INT; v_n_validos INT;
    v_bruto NUMERIC; v_total NUMERIC; v_iva NUMERIC; v_sub NUMERIC; v_pagado NUMERIC;
    v_corr TEXT; v_ctrl TEXT; v_id UUID := gen_random_uuid();
    v_id_orden INT := p_id_orden;
    v_orden_nueva BOOLEAN := FALSE;
    v_det_venta INT[] := ARRAY[]::INT[];
    v_det_orden INT[] := ARRAY[]::INT[];
    v_det INT;
    r RECORD;
BEGIN
    SELECT * INTO v_turno FROM pos.turnos_caja WHERE id_turno = p_id_turno;
    IF NOT FOUND OR v_turno.estado <> 'ABIERTO' THEN RAISE EXCEPTION 'El turno no existe o está cerrado'; END IF;
    SELECT id_sucursal INTO v_suc FROM pos.cajas WHERE id_caja = v_turno.id_caja;

    IF p_id_orden IS NOT NULL THEN
        SELECT o.id_orden, o.estado, o.id_sucursal INTO v_ord
        FROM pos.ordenes o WHERE o.id_orden = p_id_orden FOR UPDATE OF o;

        IF NOT FOUND THEN RAISE EXCEPTION 'Orden no existe'; END IF;
        IF v_ord.id_sucursal <> v_suc THEN RAISE EXCEPTION 'La orden pertenece a otra sucursal'; END IF;
        IF v_ord.estado IN ('FACTURADA', 'ANULADA')
           OR EXISTS (SELECT 1 FROM pos.ventas WHERE id_orden = p_id_orden AND estado = 'EMITIDA') THEN
            RAISE EXCEPTION 'La orden ya está facturada o está anulada';
        END IF;
    END IF;

    IF p_tipo = 'CCF' THEN
        SELECT * INTO v_cli FROM pos.clientes WHERE id_cliente = p_id_cliente;
        IF NOT FOUND OR v_cli.nrc IS NULL OR v_cli.giro_economico IS NULL THEN
            RAISE EXCEPTION 'Un CCF requiere cliente con NRC y giro económico';
        END IF;
    END IF;

    v_n_items := jsonb_array_length(p_items);
    IF v_n_items IS NULL OR v_n_items = 0 THEN RAISE EXCEPTION 'La venta no tiene productos'; END IF;

    -- El precio SIEMPRE se toma de la BD; solo productos activos y no eliminados.
    SELECT COUNT(*), COALESCE(SUM(p.precio_venta * i.cantidad), 0) INTO v_n_validos, v_bruto
    FROM jsonb_to_recordset(p_items) AS i(id_producto INT, cantidad INT, nota TEXT)
    JOIN inventario.productos p ON p.id_producto = i.id_producto AND p.activo AND p.deleted_at IS NULL AND i.cantidad > 0;
    IF v_n_validos <> v_n_items THEN RAISE EXCEPTION 'Hay productos inexistentes, inactivos o con cantidad inválida'; END IF;

    -- Extras: ligados a una línea anterior que no sea extra y permitidos para ese producto.
    IF EXISTS (
        SELECT 1
        FROM (SELECT o.pos, (o.item->>'id_producto')::INT AS id_producto, (o.item->>'cantidad')::INT AS cantidad,
                     o.item->>'nota' AS nota, (o.item->>'extra_de')::INT AS extra_de
              FROM jsonb_array_elements(p_items) WITH ORDINALITY AS o(item, pos)) AS i
        JOIN inventario.productos p ON p.id_producto = i.id_producto
        LEFT JOIN (SELECT o.pos, (o.item->>'id_producto')::INT AS id_producto, (o.item->>'cantidad')::INT AS cantidad,
                     o.item->>'nota' AS nota, (o.item->>'extra_de')::INT AS extra_de
              FROM jsonb_array_elements(p_items) WITH ORDINALITY AS o(item, pos)) AS pa
               ON pa.pos = i.extra_de
        WHERE (i.extra_de IS NULL AND p.es_extra)
           OR (i.extra_de IS NOT NULL AND (
                   pa.pos IS NULL OR pa.pos >= i.pos OR pa.extra_de IS NOT NULL
                   OR NOT EXISTS (SELECT 1 FROM inventario.producto_extras e
                                  WHERE e.id_producto = pa.id_producto AND e.id_extra = i.id_producto)))
    ) THEN
        RAISE EXCEPTION 'Extras inválidos: cada extra debe ir tras su producto y estar permitido para él';
    END IF;

    IF p_descuento > v_bruto THEN RAISE EXCEPTION 'El descuento no puede superar el total'; END IF;
    v_total := ROUND(v_bruto - p_descuento, 2);
    v_iva   := ROUND(v_total - v_total / (1 + v_tasa), 2);
    v_sub   := v_total - v_iva;

    SELECT COALESCE(SUM(monto), 0) INTO v_pagado FROM jsonb_to_recordset(p_pagos) AS x(metodo TEXT, monto NUMERIC);
    IF ROUND(v_pagado, 2) <> v_total THEN RAISE EXCEPTION 'Los pagos (%) no cuadran con el total (%)', v_pagado, v_total; END IF;

    SELECT c.correlativo, c.numero_control INTO v_corr, v_ctrl FROM pos.fn_siguiente_correlativo(v_turno.id_caja, p_tipo) c;

    -- Pago anticipado (flujo normal del POS): la orden de preparación nace aquí, solo con ítems elaborados
    -- (y los extras de esos ítems).
    IF v_id_orden IS NULL AND EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p_items) AS i(id_producto INT)
        JOIN inventario.productos p ON p.id_producto = i.id_producto AND p.es_elaborado
    ) THEN
        INSERT INTO pos.ordenes(id_turno, id_cliente, canal, etiqueta, estado)
        VALUES (p_id_turno, p_id_cliente, 'MOSTRADOR', v_corr, 'ABIERTA')
        RETURNING id_orden INTO v_id_orden;
        v_orden_nueva := TRUE;
    END IF;

    INSERT INTO pos.ventas(id_venta, id_turno, id_sucursal, id_usuario, id_cliente, id_orden, tipo_comprobante,
                           correlativo, numero_control, estado_dte, sello_recepcion, subtotal, descuento, iva, total)
    VALUES (v_id, p_id_turno, v_suc, v_turno.id_usuario, p_id_cliente, v_id_orden, p_tipo,
            v_corr, v_ctrl, 'ACEPTADO', 'SIMULADO-' || upper(substr(v_id::text, 1, 8)), v_sub, p_descuento, v_iva, v_total);

    -- Detalles en orden de llegada: la línea padre siempre se inserta antes que sus extras.
    FOR r IN
        SELECT i.pos, i.id_producto, i.cantidad, NULLIF(trim(i.nota), '') AS nota, i.extra_de,
               p.precio_venta, p.es_elaborado, COALESCE(pp.es_elaborado, FALSE) AS padre_elaborado
        FROM (SELECT o.pos, (o.item->>'id_producto')::INT AS id_producto, (o.item->>'cantidad')::INT AS cantidad,
                     o.item->>'nota' AS nota, (o.item->>'extra_de')::INT AS extra_de
              FROM jsonb_array_elements(p_items) WITH ORDINALITY AS o(item, pos)) AS i
        JOIN inventario.productos p ON p.id_producto = i.id_producto
        LEFT JOIN (SELECT o.pos, (o.item->>'id_producto')::INT AS id_producto, (o.item->>'cantidad')::INT AS cantidad,
                     o.item->>'nota' AS nota, (o.item->>'extra_de')::INT AS extra_de
              FROM jsonb_array_elements(p_items) WITH ORDINALITY AS o(item, pos)) AS pa
               ON pa.pos = i.extra_de
        LEFT JOIN inventario.productos pp ON pp.id_producto = pa.id_producto
        ORDER BY i.pos
    LOOP
        INSERT INTO pos.venta_detalles(id_venta, id_producto, cantidad, precio_unitario, subtotal_linea, nota, id_detalle_padre)
        VALUES (v_id, r.id_producto, r.cantidad, r.precio_venta, r.precio_venta * r.cantidad, r.nota,
                CASE WHEN r.extra_de IS NULL THEN NULL ELSE v_det_venta[r.extra_de] END)
        RETURNING id_detalle INTO v_det;
        v_det_venta[r.pos] := v_det;

        IF v_orden_nueva AND (r.es_elaborado OR (r.extra_de IS NOT NULL AND r.padre_elaborado)) THEN
            INSERT INTO pos.orden_detalles(id_orden, id_producto, cantidad, precio_unitario, nota, id_detalle_padre)
            VALUES (v_id_orden, r.id_producto, r.cantidad, r.precio_venta, r.nota,
                    CASE WHEN r.extra_de IS NULL THEN NULL ELSE v_det_orden[r.extra_de] END)
            RETURNING id_detalle INTO v_det;
            v_det_orden[r.pos] := v_det;
        END IF;
    END LOOP;

    INSERT INTO pos.pagos(id_venta, metodo, monto, monto_recibido, referencia)
    SELECT v_id, x.metodo, x.monto, x.monto_recibido, x.referencia
    FROM jsonb_to_recordset(p_pagos) AS x(metodo TEXT, monto NUMERIC, monto_recibido NUMERIC, referencia TEXT);

    FOR r IN SELECT id_producto, cantidad FROM jsonb_to_recordset(p_items) AS i(id_producto INT, cantidad INT)
    LOOP
        PERFORM inventario.fn_descontar_stock_por_venta(v_suc, r.id_producto, r.cantidad, v_id, v_turno.id_usuario);
    END LOOP;

    -- Pago al final de una comanda: solo se cierra como FACTURADA si ya se entregó.
    IF p_id_orden IS NOT NULL THEN
        UPDATE pos.ordenes SET estado = 'FACTURADA' WHERE id_orden = p_id_orden AND estado = 'ENTREGADA';
    END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Los extras de ejemplo (con su receta) los crea `pnpm seed:reset` (backend/seeders), no esta migración.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_user') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON inventario.producto_extras TO web_user;
        GRANT EXECUTE ON FUNCTION pos.fn_registrar_venta(UUID, VARCHAR, INT, JSONB, JSONB, NUMERIC, INT) TO web_user;
    END IF;
END $$;
