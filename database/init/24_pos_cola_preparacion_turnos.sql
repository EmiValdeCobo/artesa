-- 022_pos_cola_preparacion_turnos.sql
-- Bug: las ventas del POS no llegaban a la Cola de preparación.
-- Causa raíz: pos.fn_registrar_venta solo creaba la venta; nunca creaba pos.ordenes (lo único que lee la cola),
-- y cuando recibía una orden la marcaba FACTURADA al cobrar, sacándola de la cola antes de prepararla.
-- Regla nueva: al cobrar, los ítems ELABORADOS (es_elaborado = TRUE) generan una orden ABIERTA ("Nueva");
-- los de reventa no van a preparación. Si la venta es solo de reventa, no se crea orden.

-- 1) Ubicación explícita en ventas y órdenes (antes la caja/sucursal de la orden solo se deducía por joins).
ALTER TABLE pos.ventas  ADD COLUMN IF NOT EXISTS id_caja INT REFERENCES pos.cajas(id_caja);
ALTER TABLE pos.ordenes ADD COLUMN IF NOT EXISTS id_caja INT REFERENCES pos.cajas(id_caja);
ALTER TABLE pos.ordenes ADD COLUMN IF NOT EXISTS id_sucursal INT REFERENCES empresa.sucursales(id_sucursal);
ALTER TABLE pos.ordenes ADD COLUMN IF NOT EXISTS motivo_anulacion VARCHAR(200);

UPDATE pos.ventas v SET id_caja = t.id_caja
FROM pos.turnos_caja t WHERE t.id_turno = v.id_turno AND v.id_caja IS NULL;
UPDATE pos.ordenes o SET id_caja = c.id_caja, id_sucursal = c.id_sucursal
FROM pos.turnos_caja t JOIN pos.cajas c ON c.id_caja = t.id_caja
WHERE t.id_turno = o.id_turno AND (o.id_caja IS NULL OR o.id_sucursal IS NULL);

ALTER TABLE pos.ventas  ALTER COLUMN id_caja SET NOT NULL;
ALTER TABLE pos.ordenes ALTER COLUMN id_caja SET NOT NULL;
ALTER TABLE pos.ordenes ALTER COLUMN id_sucursal SET NOT NULL;

-- La caja y la sucursal SIEMPRE salen del turno (no se confía en quien inserta: API, función o seeder).
CREATE OR REPLACE FUNCTION pos.fn_trg_ubicacion_desde_turno() RETURNS TRIGGER AS $$
BEGIN
    SELECT c.id_caja, c.id_sucursal INTO NEW.id_caja, NEW.id_sucursal
    FROM pos.turnos_caja t JOIN pos.cajas c ON c.id_caja = t.id_caja
    WHERE t.id_turno = NEW.id_turno;
    IF NEW.id_caja IS NULL THEN RAISE EXCEPTION 'El turno no existe'; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ventas_ubicacion ON pos.ventas;
CREATE TRIGGER trg_ventas_ubicacion BEFORE INSERT OR UPDATE OF id_turno ON pos.ventas
    FOR EACH ROW EXECUTE FUNCTION pos.fn_trg_ubicacion_desde_turno();
DROP TRIGGER IF EXISTS trg_ordenes_ubicacion ON pos.ordenes;
CREATE TRIGGER trg_ordenes_ubicacion BEFORE INSERT OR UPDATE OF id_turno ON pos.ordenes
    FOR EACH ROW EXECUTE FUNCTION pos.fn_trg_ubicacion_desde_turno();

-- Cola por sucursal y verificación de pedidos activos al cerrar un turno.
CREATE INDEX IF NOT EXISTS ix_ordenes_activas_sucursal ON pos.ordenes (id_sucursal, creado_en, id_orden)
    WHERE estado IN ('ABIERTA', 'EN_PREPARACION', 'LISTA');
CREATE INDEX IF NOT EXISTS ix_ordenes_activas_turno ON pos.ordenes (id_turno)
    WHERE estado IN ('ABIERTA', 'EN_PREPARACION', 'LISTA');
CREATE INDEX IF NOT EXISTS ix_ventas_orden ON pos.ventas (id_orden) WHERE id_orden IS NOT NULL;

-- 2) Registrar venta: crea la orden de preparación con los ítems elaborados.
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

    IF p_descuento > v_bruto THEN RAISE EXCEPTION 'El descuento no puede superar el total'; END IF;
    v_total := ROUND(v_bruto - p_descuento, 2);
    v_iva   := ROUND(v_total - v_total / (1 + v_tasa), 2);
    v_sub   := v_total - v_iva;

    SELECT COALESCE(SUM(monto), 0) INTO v_pagado FROM jsonb_to_recordset(p_pagos) AS x(metodo TEXT, monto NUMERIC);
    IF ROUND(v_pagado, 2) <> v_total THEN RAISE EXCEPTION 'Los pagos (%) no cuadran con el total (%)', v_pagado, v_total; END IF;

    SELECT c.correlativo, c.numero_control INTO v_corr, v_ctrl FROM pos.fn_siguiente_correlativo(v_turno.id_caja, p_tipo) c;

    -- Pago anticipado (flujo normal del POS): la orden de preparación nace aquí, solo con ítems elaborados.
    IF v_id_orden IS NULL AND EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p_items) AS i(id_producto INT)
        JOIN inventario.productos p ON p.id_producto = i.id_producto AND p.es_elaborado
    ) THEN
        INSERT INTO pos.ordenes(id_turno, id_cliente, canal, etiqueta, estado)
        VALUES (p_id_turno, p_id_cliente, 'MOSTRADOR', v_corr, 'ABIERTA')
        RETURNING id_orden INTO v_id_orden;

        INSERT INTO pos.orden_detalles(id_orden, id_producto, cantidad, precio_unitario, nota)
        SELECT v_id_orden, p.id_producto, i.cantidad, p.precio_venta, i.nota
        FROM jsonb_to_recordset(p_items) AS i(id_producto INT, cantidad INT, nota TEXT)
        JOIN inventario.productos p ON p.id_producto = i.id_producto AND p.es_elaborado;
    END IF;

    INSERT INTO pos.ventas(id_venta, id_turno, id_sucursal, id_usuario, id_cliente, id_orden, tipo_comprobante,
                           correlativo, numero_control, estado_dte, sello_recepcion, subtotal, descuento, iva, total)
    VALUES (v_id, p_id_turno, v_suc, v_turno.id_usuario, p_id_cliente, v_id_orden, p_tipo,
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

    -- Pago al final de una comanda: solo se cierra como FACTURADA si ya se entregó; si sigue en
    -- preparación conserva su estado (la venta queda ligada por ventas.id_orden) y no sale de la cola.
    IF p_id_orden IS NOT NULL THEN
        UPDATE pos.ordenes SET estado = 'FACTURADA' WHERE id_orden = p_id_orden AND estado = 'ENTREGADA';
    END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 3) Anular venta: la orden ligada que aún no se entrega sale de la cola como ANULADA.
CREATE OR REPLACE FUNCTION pos.fn_anular_venta(p_id_venta UUID, p_motivo TEXT, p_id_usuario UUID) RETURNS VOID AS $$
DECLARE v pos.ventas%ROWTYPE; v_estado_turno TEXT;
BEGIN
    SELECT * INTO v FROM pos.ventas WHERE id_venta = p_id_venta FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Venta no existe'; END IF;
    IF v.estado = 'ANULADA' THEN RAISE EXCEPTION 'La venta ya está anulada'; END IF;
    SELECT estado INTO v_estado_turno FROM pos.turnos_caja WHERE id_turno = v.id_turno;
    IF v_estado_turno <> 'ABIERTO' THEN RAISE EXCEPTION 'El turno ya cerró: emita una nota de crédito'; END IF;
    IF COALESCE(trim(p_motivo), '') = '' THEN RAISE EXCEPTION 'Debe indicar el motivo de anulación'; END IF;

    UPDATE pos.ventas SET estado = 'ANULADA', motivo_anulacion = p_motivo, anulada_por = p_id_usuario, anulada_en = now()
    WHERE id_venta = p_id_venta;
    IF v.id_orden IS NOT NULL THEN
        UPDATE pos.ordenes SET estado = 'ANULADA', motivo_anulacion = left(p_motivo, 200)
        WHERE id_orden = v.id_orden AND estado IN ('ABIERTA', 'EN_PREPARACION', 'LISTA');
    END IF;
    PERFORM inventario.fn_revertir_stock_venta(p_id_venta, p_id_usuario);
END;
$$ LANGUAGE plpgsql;

-- 4) El cajero ve la cola de su sucursal: debe poder entregar o cancelar pedidos antes de cerrar caja.
INSERT INTO seguridad.roles_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM seguridad.roles r CROSS JOIN seguridad.permisos p
WHERE r.nombre = 'CAJERO' AND p.codigo = 'POS_VER_COLA_PREPARACION'
ON CONFLICT DO NOTHING;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_user') THEN
        GRANT EXECUTE ON FUNCTION pos.fn_trg_ubicacion_desde_turno() TO web_user;
        GRANT EXECUTE ON FUNCTION pos.fn_registrar_venta(UUID, VARCHAR, INT, JSONB, JSONB, NUMERIC, INT) TO web_user;
        GRANT EXECUTE ON FUNCTION pos.fn_anular_venta(UUID, TEXT, UUID) TO web_user;
    END IF;
END $$;
