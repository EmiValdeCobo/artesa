-- 020: tipo de proveedor (COMPRA/SERVICIO) y eliminación lógica de facturas de compra.
-- Espejo: database/init/22_compras_tipo_proveedor_eliminar_factura.sql
-- Motivo: las compras de inventario solo deben usar proveedores de insumos y los gastos
-- operativos solo proveedores de servicios; además, una factura mal ingresada debe poder
-- retirarse sin perder el rastro de auditoría (soft delete, nunca DELETE físico).

-- 1) Tipo de proveedor. Los existentes quedan como COMPRA; el backfill está en 021.
ALTER TABLE compras.proveedores
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(10) NOT NULL DEFAULT 'COMPRA';
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_proveedores_tipo') THEN
        ALTER TABLE compras.proveedores
            ADD CONSTRAINT ck_proveedores_tipo CHECK (tipo IN ('COMPRA', 'SERVICIO'));
    END IF;
END $$;

-- 2) Eliminación lógica de facturas y de sus abonos.
ALTER TABLE compras.facturas_compra
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES seguridad.usuarios(id_usuario),
    ADD COLUMN IF NOT EXISTS motivo_eliminacion VARCHAR(200);
ALTER TABLE compras.pagos_proveedor
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES seguridad.usuarios(id_usuario);

-- El número de factura solo debe ser único entre facturas vigentes: así se puede volver a
-- registrar correctamente una factura que se eliminó por estar mal ingresada.
ALTER TABLE compras.facturas_compra DROP CONSTRAINT IF EXISTS facturas_compra_id_proveedor_num_factura_key;
CREATE UNIQUE INDEX IF NOT EXISTS ux_facturas_compra_proveedor_num_vigente
    ON compras.facturas_compra (id_proveedor, num_factura) WHERE deleted_at IS NULL;

-- 3) El trigger de pagos ignora abonos eliminados al recalcular el estado.
CREATE OR REPLACE FUNCTION compras.fn_trg_pago_proveedor() RETURNS TRIGGER AS $$
DECLARE v_total NUMERIC; v_pagado NUMERIC;
BEGIN
    SELECT total INTO v_total FROM compras.facturas_compra WHERE id_compra = NEW.id_compra;
    SELECT SUM(monto) INTO v_pagado FROM compras.pagos_proveedor
    WHERE id_compra = NEW.id_compra AND deleted_at IS NULL;
    IF v_pagado > v_total THEN RAISE EXCEPTION 'El pago excede el saldo de la factura'; END IF;
    UPDATE compras.facturas_compra
    SET estado_pago = CASE WHEN v_pagado = v_total THEN 'PAGADO' ELSE 'PARCIAL' END
    WHERE id_compra = NEW.id_compra;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) Eliminar factura: todo en la transacción del llamador.
--    - Compra de inventario (COSTO): saca del stock lo que entró (movimiento AJUSTE con
--      referencia COMPRA_ANULADA). Si el insumo ya se consumió y no alcanza, fn_mover_stock
--      lanza 'Stock insuficiente' y no se elimina nada. El costo promedio no se recalcula
--      hacia atrás (ya se usó para costear ventas); queda documentado en el Kárdex.
--    - Abonos: se marcan como eliminados (los pagos a proveedor no mueven caja).
--    - La factura queda con deleted_at/deleted_by/motivo para auditoría.
CREATE OR REPLACE FUNCTION compras.fn_eliminar_factura(
    p_id_compra UUID, p_id_usuario UUID, p_motivo VARCHAR DEFAULT NULL
) RETURNS VOID AS $$
DECLARE v_f RECORD; r RECORD; v_motivo TEXT;
BEGIN
    SELECT id_compra, id_sucursal, num_factura, deleted_at INTO v_f
    FROM compras.facturas_compra WHERE id_compra = p_id_compra FOR UPDATE;
    IF NOT FOUND OR v_f.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Factura no encontrada' USING ERRCODE = 'P0002';
    END IF;
    v_motivo := 'Factura ' || v_f.num_factura || ' eliminada' || COALESCE(': ' || NULLIF(TRIM(p_motivo), ''), '');

    FOR r IN SELECT id_insumo, cantidad, costo_unitario FROM compras.compra_detalles
             WHERE id_compra = p_id_compra AND id_insumo IS NOT NULL ORDER BY id_insumo, id_detalle LOOP
        PERFORM inventario.fn_mover_stock(v_f.id_sucursal, r.id_insumo, -r.cantidad, 'AJUSTE',
                                          'COMPRA_ANULADA', p_id_compra, p_id_usuario, r.costo_unitario, v_motivo);
    END LOOP;

    UPDATE compras.pagos_proveedor SET deleted_at = now(), deleted_by = p_id_usuario
    WHERE id_compra = p_id_compra AND deleted_at IS NULL;

    UPDATE compras.facturas_compra
    SET deleted_at = now(), deleted_by = p_id_usuario, motivo_eliminacion = NULLIF(TRIM(p_motivo), '')
    WHERE id_compra = p_id_compra;
END;
$$ LANGUAGE plpgsql;

-- 5) La vista de CxP excluye facturas y abonos eliminados (mismas columnas).
CREATE OR REPLACE VIEW reportes.vw_cuentas_por_pagar AS
SELECT pr.razon_social AS proveedor, f.num_factura, f.tipo_costo, f.fecha_emision, f.fecha_vencimiento, f.total,
       COALESCE(SUM(pp.monto), 0) AS pagado, f.total - COALESCE(SUM(pp.monto), 0) AS saldo,
       GREATEST(CURRENT_DATE - f.fecha_vencimiento, 0) AS dias_vencida, f.estado_pago
FROM compras.facturas_compra f
JOIN compras.proveedores pr USING (id_proveedor)
LEFT JOIN compras.pagos_proveedor pp ON pp.id_compra = f.id_compra AND pp.deleted_at IS NULL
WHERE f.deleted_at IS NULL
GROUP BY pr.razon_social, f.id_compra, f.num_factura, f.tipo_costo, f.fecha_emision, f.fecha_vencimiento, f.total, f.estado_pago;

-- 6) Permiso nuevo, solo para ADMIN.
INSERT INTO seguridad.permisos (codigo, modulo, descripcion)
VALUES ('COM_ELIMINAR_FACTURA', 'COMPRAS', 'Eliminar facturas de compra mal ingresadas')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO seguridad.roles_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM seguridad.roles r CROSS JOIN seguridad.permisos p
WHERE r.nombre = 'ADMIN' AND p.codigo = 'COM_ELIMINAR_FACTURA'
ON CONFLICT DO NOTHING;
