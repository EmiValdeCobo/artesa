-- Conserva intactas las compras anteriores; no es posible inferir con certeza
-- el importe con IVA ni la tasa histórica. Las filas existentes quedan NULL.
ALTER TABLE compras.compra_detalles
    ADD COLUMN IF NOT EXISTS costo_unitario_con_iva NUMERIC(12,6)
    CHECK (costo_unitario_con_iva >= 0);

CREATE OR REPLACE FUNCTION compras.fn_trg_detalle_compra() RETURNS TRIGGER AS $$
DECLARE v_suc INT; v_stock_total NUMERIC; v_costo NUMERIC; v_nuevo NUMERIC; v_usr UUID; v_costo_sin_iva NUMERIC;
BEGIN
    IF NEW.id_insumo IS NULL THEN RETURN NEW; END IF;
    v_costo_sin_iva := NEW.costo_unitario;
    SELECT id_sucursal, id_usuario INTO v_suc, v_usr
    FROM compras.facturas_compra WHERE id_compra = NEW.id_compra;
    SELECT COALESCE(SUM(GREATEST(stock_actual, 0)), 0) INTO v_stock_total
    FROM inventario.stock_sucursal WHERE id_insumo = NEW.id_insumo;
    SELECT costo_promedio INTO v_costo FROM inventario.insumos WHERE id_insumo = NEW.id_insumo;

    v_nuevo := (v_stock_total * v_costo + NEW.cantidad * v_costo_sin_iva) / (v_stock_total + NEW.cantidad);
    UPDATE inventario.insumos SET costo_promedio = ROUND(v_nuevo, 6) WHERE id_insumo = NEW.id_insumo;
    PERFORM inventario.fn_mover_stock(v_suc, NEW.id_insumo, NEW.cantidad, 'COMPRA', 'COMPRA', NEW.id_compra, v_usr, v_costo_sin_iva);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- costo_unitario del JSON mantiene el contrato y desde esta versión significa con IVA.
CREATE OR REPLACE FUNCTION compras.fn_registrar_compra(
    p_id_proveedor INT, p_id_sucursal INT, p_num_factura VARCHAR, p_fecha DATE, p_condicion VARCHAR,
    p_items JSONB, p_id_usuario UUID DEFAULT NULL, p_tipo_costo VARCHAR DEFAULT 'COSTO'
) RETURNS UUID AS $$
DECLARE
    v_id UUID := gen_random_uuid();
    v_sub NUMERIC;
    v_iva NUMERIC;
    v_total NUMERIC;
    v_dias INT;
    v_tasa NUMERIC;
BEGIN
    SELECT CASE WHEN p_condicion = 'CREDITO' THEN dias_credito ELSE 0 END
    INTO v_dias FROM compras.proveedores WHERE id_proveedor = p_id_proveedor;
    v_tasa := empresa.fn_param('tasa_iva')::NUMERIC;

    WITH importes AS (
        SELECT ROUND(i.cantidad * i.costo_unitario, 2) AS total_linea
        FROM jsonb_to_recordset(p_items) AS i(cantidad NUMERIC, costo_unitario NUMERIC)
    ), lineas AS (
        SELECT total_linea, ROUND(total_linea / (1 + v_tasa), 2) AS subtotal_linea
        FROM importes
    )
    SELECT COALESCE(SUM(subtotal_linea), 0),
           COALESCE(SUM(total_linea - subtotal_linea), 0),
           COALESCE(SUM(total_linea), 0)
    INTO v_sub, v_iva, v_total FROM lineas;

    IF v_total <= 0 THEN RAISE EXCEPTION 'El total de la compra debe ser mayor que cero'; END IF;

    INSERT INTO compras.facturas_compra(
        id_compra, id_proveedor, id_sucursal, id_usuario, num_factura, tipo_costo,
        fecha_emision, condicion_pago, fecha_vencimiento, subtotal, iva_credito, total
    ) VALUES (
        v_id, p_id_proveedor, p_id_sucursal, p_id_usuario, p_num_factura, p_tipo_costo,
        p_fecha, p_condicion, p_fecha + v_dias, v_sub, v_iva, v_total
    );

    INSERT INTO compras.compra_detalles(
        id_compra, id_insumo, descripcion, cantidad, costo_unitario,
        costo_unitario_con_iva, subtotal
    )
    SELECT v_id, i.id_insumo, i.descripcion, i.cantidad,
           ROUND(i.costo_unitario / (1 + v_tasa), 6),
           i.costo_unitario,
           ROUND(ROUND(i.cantidad * i.costo_unitario, 2) / (1 + v_tasa), 2)
    FROM jsonb_to_recordset(p_items) AS i(
        id_insumo INT, descripcion TEXT, cantidad NUMERIC, costo_unitario NUMERIC
    );
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;
