-- Acelera la búsqueda de detalles por orden y la carga de órdenes activas en KDS.
CREATE INDEX IF NOT EXISTS ix_orden_detalles_orden_detalle
  ON pos.orden_detalles (id_orden, id_detalle);

DROP INDEX IF EXISTS pos.ix_ordenes_en_preparacion;
CREATE INDEX IF NOT EXISTS ix_ordenes_cola_activa
  ON pos.ordenes (creado_en, id_orden) INCLUDE (id_turno)
  WHERE estado IN ('ABIERTA', 'EN_PREPARACION', 'LISTA');
