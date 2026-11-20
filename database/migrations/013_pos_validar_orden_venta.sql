-- 013_pos_validar_orden_venta.sql
-- T18: pos.fn_registrar_venta valida que la orden exista, pertenezca a la sucursal del turno y no esté facturada/anulada.
-- Se separa de 009 porque una migración aplicada no debe modificarse (checksum en public.schema_migrations).

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
    r RECORD;
BEGIN
    SELECT * INTO v_turno FROM pos.turnos_caja WHERE id_turno = p_id_turno;
    IF NOT FOUND OR v_turno.estado <> 'ABIERTO' THEN RAISE EXCEPTION 'El turno no existe o está cerrado'; END IF;
    SELECT id_sucursal INTO v_suc FROM pos.cajas WHERE id_caja = v_turno.id_caja;

    IF p_id_orden IS NOT NULL THEN
        SELECT o.id_orden, o.estado, c.id_sucursal INTO v_ord
        FROM pos.ordenes o
        JOIN pos.turnos_caja t ON t.id_turno = o.id_turno
        JOIN pos.cajas c ON c.id_caja = t.id_caja
        WHERE o.id_orden = p_id_orden
        FOR UPDATE OF o;

        IF NOT FOUND THEN RAISE EXCEPTION 'Orden no existe'; END IF;
        IF v_ord.id_sucursal <> v_suc THEN RAISE EXCEPTION 'La orden pertenece a otra sucursal'; END IF;
        IF v_ord.estado IN ('FACTURADA', 'ANULADA') THEN
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
