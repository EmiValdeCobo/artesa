-- 018: tipo de documento de compra (CCF/CF/FSE) y alerta de margen bajo.
-- Motivo: solo el Comprobante de Crédito Fiscal (CCF) permite descontar el IVA pagado
-- (Ley de IVA, arts. 64-65). En una Factura de Consumidor Final (CF) o de Sujeto
-- Excluido (FSE) ese IVA no se recupera, así que es parte del costo real del insumo.
-- Hasta ahora el sistema asumía CCF siempre; los históricos se quedan como CCF.

ALTER TABLE compras.facturas_compra
    ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(3) NOT NULL DEFAULT 'CCF';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_facturas_compra_tipo_documento') THEN
        ALTER TABLE compras.facturas_compra
            ADD CONSTRAINT ck_facturas_compra_tipo_documento
            CHECK (tipo_documento IN ('CCF', 'CF', 'FSE'));
    END IF;
END $$;

-- Se elimina la firma anterior para que no convivan dos sobrecargas ambiguas.
DROP FUNCTION IF EXISTS compras.fn_registrar_compra(INT, INT, VARCHAR, DATE, VARCHAR, JSONB, UUID, VARCHAR);

-- costo_unitario del JSON sigue siendo el precio CON IVA tal como viene en el documento.
-- Con CCF se separa el IVA (crédito fiscal) y el inventario se costea al neto.
-- Con CF/FSE no hay crédito fiscal: subtotal = total, iva_credito = 0 y el costo del
-- insumo es el precio completo, porque ese IVA es un gasto que no se recupera.
CREATE OR REPLACE FUNCTION compras.fn_registrar_compra(
    p_id_proveedor INT, p_id_sucursal INT, p_num_factura VARCHAR, p_fecha DATE, p_condicion VARCHAR,
    p_items JSONB, p_id_usuario UUID DEFAULT NULL, p_tipo_costo VARCHAR DEFAULT 'COSTO',
    p_tipo_documento VARCHAR DEFAULT 'CCF'
) RETURNS UUID AS $$
DECLARE
    v_id UUID := gen_random_uuid();
    v_sub NUMERIC;
    v_iva NUMERIC;
    v_total NUMERIC;
    v_dias INT;
    v_tasa NUMERIC;
BEGIN
    IF p_tipo_documento IS NULL OR p_tipo_documento NOT IN ('CCF', 'CF', 'FSE') THEN
        RAISE EXCEPTION 'Tipo de documento inválido: %. Use CCF, CF o FSE', p_tipo_documento;
    END IF;

    SELECT CASE WHEN p_condicion = 'CREDITO' THEN dias_credito ELSE 0 END
    INTO v_dias FROM compras.proveedores WHERE id_proveedor = p_id_proveedor;
    -- Tasa efectiva: la de ley si el documento da crédito fiscal; 0 si no (todo es costo).
    v_tasa := CASE WHEN p_tipo_documento = 'CCF' THEN empresa.fn_param('tasa_iva')::NUMERIC ELSE 0 END;

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
        fecha_emision, condicion_pago, fecha_vencimiento, subtotal, iva_credito, total,
        tipo_documento
    ) VALUES (
        v_id, p_id_proveedor, p_id_sucursal, p_id_usuario, p_num_factura, p_tipo_costo,
        p_fecha, p_condicion, p_fecha + v_dias, v_sub, v_iva, v_total,
        p_tipo_documento
    );

    -- El trigger trg_detalle_compra toma costo_unitario para el costo promedio ponderado.
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

-- Margen mínimo esperado sobre el precio sin IVA (fracción). 0.60 = 60 %.
-- El precio de venta nunca se ajusta solo cuando sube un insumo: es una decisión
-- comercial de una persona. Este parámetro solo sirve para avisar que el margen bajó.
INSERT INTO empresa.parametros(clave, valor, descripcion)
VALUES ('margen_minimo', '0.60', 'Margen mínimo sobre precio sin IVA para alertar (fracción)')
ON CONFLICT DO NOTHING;

-- Productos activos cuyo margen quedó por debajo del mínimo. Reutiliza el costo de
-- receta de vw_costo_margen_producto (costo promedio ponderado, calculado al vuelo);
-- en ese promedio el stock negativo cuenta como 0 para que un faltante no "absorba"
-- el precio de la compra nueva. Todo en NUMERIC; porcentajes ×100 con 2 decimales.
CREATE OR REPLACE VIEW reportes.vw_productos_margen_bajo AS
WITH params AS (
    SELECT empresa.fn_param('margen_minimo')::NUMERIC AS margen_minimo
)
SELECT m.id_producto, m.nombre, m.precio_sin_iva, m.costo_receta,
       ROUND((m.precio_sin_iva - m.costo_receta) / m.precio_sin_iva * 100, 2) AS margen_pct,
       ROUND(pa.margen_minimo * 100, 2) AS margen_minimo_pct
FROM reportes.vw_costo_margen_producto m
JOIN inventario.productos p ON p.id_producto = m.id_producto
CROSS JOIN params pa
WHERE p.activo AND p.deleted_at IS NULL
  AND m.precio_sin_iva > 0
  AND (m.precio_sin_iva - m.costo_receta) / m.precio_sin_iva < pa.margen_minimo;

-- web_user (usuario de la app) necesita leer la vista nueva y ejecutar la firma nueva;
-- los GRANT ON ALL de 002 solo cubren objetos que existían en ese momento.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_user') THEN
        GRANT SELECT ON reportes.vw_productos_margen_bajo TO web_user;
        GRANT EXECUTE ON FUNCTION compras.fn_registrar_compra(INT, INT, VARCHAR, DATE, VARCHAR, JSONB, UUID, VARCHAR, VARCHAR) TO web_user;
    END IF;
END $$;
