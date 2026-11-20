-- Centraliza el umbral de alertas de stock y conserva IDs para filtrar por sucursal/insumo.
-- Un mínimo nulo o cero desactiva la alerta; llegar exactamente al mínimo ya cumple el objetivo.
CREATE OR REPLACE VIEW reportes.vw_alertas_stock AS
SELECT s.nombre AS sucursal,
       i.nombre AS insumo,
       u.codigo AS unidad,
       ss.stock_actual,
       ss.stock_minimo,
       GREATEST(ss.stock_minimo - ss.stock_actual, 0) AS faltante,
       CASE WHEN ss.stock_actual <= 0 THEN 'AGOTADO' ELSE 'BAJO_MINIMO' END AS nivel,
       ss.id_sucursal,
       ss.id_insumo
FROM inventario.stock_sucursal ss
JOIN empresa.sucursales s ON s.id_sucursal = ss.id_sucursal
JOIN inventario.insumos i ON i.id_insumo = ss.id_insumo
JOIN inventario.unidades_medida u ON u.id_unidad = i.id_unidad_base
WHERE i.activo
  AND i.deleted_at IS NULL
  AND ss.stock_minimo > 0
  AND ss.stock_actual < ss.stock_minimo;
