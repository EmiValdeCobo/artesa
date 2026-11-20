-- 021: backfill del tipo de proveedor para registros existentes.
-- Espejo: database/init/23_backfill_tipo_proveedor.sql
-- Regla: un proveedor que solo tiene facturas de GASTO (y ninguna de COSTO) es de SERVICIO;
-- el resto conserva el default COMPRA. Se puede corregir después desde Proveedores.
UPDATE compras.proveedores p
SET tipo = 'SERVICIO'
WHERE p.tipo = 'COMPRA'
  AND EXISTS (SELECT 1 FROM compras.facturas_compra f WHERE f.id_proveedor = p.id_proveedor AND f.tipo_costo = 'GASTO')
  AND NOT EXISTS (SELECT 1 FROM compras.facturas_compra f WHERE f.id_proveedor = p.id_proveedor AND f.tipo_costo = 'COSTO');
