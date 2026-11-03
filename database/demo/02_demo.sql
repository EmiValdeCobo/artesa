-- DEMO / PRUEBA DE FUNCIONAMIENTO (ejecutar después del schema)
\set ON_ERROR_STOP on
\pset format aligned

-- IDs buscados por nombre (así el demo no depende del orden en que se insertaron los datos)
SELECT (SELECT id_producto FROM inventario.productos WHERE nombre='Latte Grande')            AS p_latte,
       (SELECT id_producto FROM inventario.productos WHERE nombre='Galleta de Avena')        AS p_galleta,
       (SELECT id_producto FROM inventario.productos WHERE nombre='Frappé de Café Grande')   AS p_frappe,
       (SELECT id_producto FROM inventario.productos WHERE nombre='Sándwich Jamón y Queso')  AS p_sandwich,
       (SELECT id_producto FROM inventario.productos WHERE nombre='Espresso')                AS p_espresso,
       (SELECT id_producto FROM inventario.productos WHERE nombre='Café Molido 340g')        AS p_cafemolido,
       (SELECT id_insumo   FROM inventario.insumos   WHERE nombre='Café Grano Especialidad') AS i_cafe,
       (SELECT id_insumo   FROM inventario.insumos   WHERE nombre='Leche Entera')            AS i_leche,
       (SELECT id_insumo   FROM inventario.insumos   WHERE nombre='Vaso 16oz')               AS i_vaso16 \gset

\echo '=== 1. RBAC: ¿qué puede hacer cada usuario? ==='
SELECT u.username, seguridad.fn_tiene_permiso(u.id_usuario,'POS_COBRAR') AS puede_cobrar,
       seguridad.fn_tiene_permiso(u.id_usuario,'POS_ANULAR_VENTA') AS puede_anular,
       seguridad.fn_tiene_permiso(u.id_usuario,'SEG_GESTIONAR_ROLES') AS puede_crear_roles
FROM seguridad.usuarios u ORDER BY u.username;

\echo '=== 2. Crear un ROL nuevo desde cero (ej. SUPERVISOR) con 3 permisos ==='
INSERT INTO seguridad.roles(nombre, descripcion) VALUES ('SUPERVISOR','Supervisa ventas sin tocar configuración');
INSERT INTO seguridad.roles_permisos SELECT r.id_rol, p.id_permiso FROM seguridad.roles r, seguridad.permisos p
 WHERE r.nombre='SUPERVISOR' AND p.codigo IN ('POS_ANULAR_VENTA','CAJA_VER_CUADRES','REP_VER_DASHBOARD');
SELECT rol, string_agg(permiso, ', ' ORDER BY permiso) AS permisos FROM
 (SELECT r.nombre rol, p.codigo permiso FROM seguridad.roles r JOIN seguridad.roles_permisos rp USING(id_rol) JOIN seguridad.permisos p USING(id_permiso) WHERE r.nombre='SUPERVISOR') x GROUP BY rol;

\echo '=== 3. Abrir turno (cajero1 en caja 1, $50 de fondo) ==='
INSERT INTO pos.turnos_caja(id_caja, id_usuario, monto_apertura)
SELECT 1, id_usuario, 50.00 FROM seguridad.usuarios WHERE username='cajero1';
\echo '--- intentar abrir OTRO turno en la misma caja (debe fallar) ---'
DO $$ BEGIN
  INSERT INTO pos.turnos_caja(id_caja, id_usuario, monto_apertura) SELECT 1, id_usuario, 10 FROM seguridad.usuarios WHERE username='gerente1';
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK, rechazado: ya hay un turno abierto en esa caja'; END $$;

\echo '=== 4. Stock ANTES de vender ==='
SELECT i.nombre, ss.stock_actual FROM inventario.stock_sucursal ss JOIN inventario.insumos i USING(id_insumo)
WHERE ss.id_sucursal=1 AND i.nombre IN ('Café Grano Especialidad','Leche Entera','Vaso 16oz','Tapadera','Viñeta','Galleta de Avena Empacada') ORDER BY i.nombre;

\echo '=== 5. VENTA 1 (FCF): 2 Latte Grande + 1 Galleta, pago mixto efectivo+tarjeta ==='
SELECT pos.fn_registrar_venta(
  (SELECT id_turno FROM pos.turnos_caja WHERE estado='ABIERTO'), 'FCF', NULL,
  jsonb_build_array(jsonb_build_object('id_producto',:p_latte,'cantidad',2,'nota','sin azúcar'), jsonb_build_object('id_producto',:p_galleta,'cantidad',1)),
  '[{"metodo":"EFECTIVO","monto":5.00,"monto_recibido":10.00},{"metodo":"TARJETA","monto":4.00,"referencia":"AUTH-884213"}]'::jsonb) AS id_venta \gset v1_
SELECT correlativo, numero_control, tipo_comprobante, subtotal, iva, total, estado_dte FROM pos.ventas WHERE id_venta = :'v1_id_venta';
SELECT p.nombre, d.cantidad, d.precio_unitario, d.subtotal_linea, d.nota FROM pos.venta_detalles d JOIN inventario.productos p USING(id_producto) WHERE id_venta = :'v1_id_venta';

\echo '=== 6. Stock DESPUÉS (2 lattes = 36g café, 500ml leche, 2 vasos, 2 tapas, 2 viñetas; 1 galleta) ==='
SELECT i.nombre, ss.stock_actual FROM inventario.stock_sucursal ss JOIN inventario.insumos i USING(id_insumo)
WHERE ss.id_sucursal=1 AND i.nombre IN ('Café Grano Especialidad','Leche Entera','Vaso 16oz','Tapadera','Viñeta','Galleta de Avena Empacada') ORDER BY i.nombre;

\echo '=== 7. Kardex de esa venta ==='
SELECT i.nombre, m.tipo, m.cantidad, m.stock_resultante FROM inventario.movimientos_inventario m JOIN inventario.insumos i USING(id_insumo) WHERE m.referencia_id = :'v1_id_venta' ORDER BY m.id_movimiento;

\echo '=== 8. VENTA 2 (CCF): cliente con NRC, 1 Frappé + 1 Sándwich, pago BITCOIN/Chivo ==='
INSERT INTO pos.clientes(nombre_razon_social, tipo_documento, num_documento, nrc, giro_economico, direccion)
VALUES ('Consultores Tech, S.A. de C.V.','NIT','0614-111111-111-1','998877-6','Servicios de consultoría','Col. Escalón, San Salvador');
SELECT pos.fn_registrar_venta((SELECT id_turno FROM pos.turnos_caja WHERE estado='ABIERTO'),'CCF',1,
  jsonb_build_array(jsonb_build_object('id_producto',:p_frappe,'cantidad',1), jsonb_build_object('id_producto',:p_sandwich,'cantidad',1)),
  '[{"metodo":"BITCOIN_CHIVO","monto":9.25,"referencia":"0xabc123"}]'::jsonb) AS id_venta \gset v2_
SELECT correlativo, numero_control, subtotal, iva, total FROM pos.ventas WHERE id_venta = :'v2_id_venta';

\echo '=== 9. Validaciones: CCF sin cliente / pagos que no cuadran / sin stock ==='
DO $$ BEGIN
  PERFORM pos.fn_registrar_venta((SELECT id_turno FROM pos.turnos_caja WHERE estado='ABIERTO'),'CCF',NULL,jsonb_build_array(jsonb_build_object('id_producto',(SELECT id_producto FROM inventario.productos WHERE nombre='Espresso'),'cantidad',1)),'[{"metodo":"EFECTIVO","monto":2.00}]'::jsonb);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Rechazado CCF sin cliente: %', SQLERRM; END $$;
DO $$ BEGIN
  PERFORM pos.fn_registrar_venta((SELECT id_turno FROM pos.turnos_caja WHERE estado='ABIERTO'),'FCF',NULL,jsonb_build_array(jsonb_build_object('id_producto',(SELECT id_producto FROM inventario.productos WHERE nombre='Espresso'),'cantidad',1)),'[{"metodo":"EFECTIVO","monto":1.00}]'::jsonb);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Rechazado pago incorrecto: %', SQLERRM; END $$;
DO $$ BEGIN
  PERFORM pos.fn_registrar_venta((SELECT id_turno FROM pos.turnos_caja WHERE estado='ABIERTO'),'FCF',NULL,jsonb_build_array(jsonb_build_object('id_producto',(SELECT id_producto FROM inventario.productos WHERE nombre='Café Molido 340g'),'cantidad',100)),'[{"metodo":"EFECTIVO","monto":950.00}]'::jsonb);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Rechazado por stock: %', SQLERRM; END $$;

\echo '=== 10. Anular la venta 1 y comprobar que el stock regresa ==='
SELECT pos.fn_anular_venta(:'v1_id_venta','Cliente se arrepintió', (SELECT id_usuario FROM seguridad.usuarios WHERE username='gerente1'));
SELECT i.nombre, ss.stock_actual FROM inventario.stock_sucursal ss JOIN inventario.insumos i USING(id_insumo)
WHERE ss.id_sucursal=1 AND i.nombre IN ('Café Grano Especialidad','Leche Entera','Galleta de Avena Empacada') ORDER BY i.nombre;

\echo '=== 11. Una venta más (efectivo) y un retiro de caja ==='
SELECT pos.fn_registrar_venta((SELECT id_turno FROM pos.turnos_caja WHERE estado='ABIERTO'),'FCF',NULL,
  jsonb_build_array(jsonb_build_object('id_producto',:p_latte,'cantidad',1)),'[{"metodo":"EFECTIVO","monto":3.75,"monto_recibido":5}]'::jsonb) \gset
INSERT INTO pos.movimientos_caja(id_turno,tipo,concepto,monto,id_usuario)
SELECT id_turno,'EGRESO','Compra de hielo urgente',5.00,id_usuario FROM pos.turnos_caja WHERE estado='ABIERTO';

\echo '=== 12. CUADRE: lo que el sistema espera (en vivo) ==='
SELECT monto_apertura, ventas_efectivo, ingresos_caja, egresos_caja, esperado_efectivo, esperado_tarjeta, esperado_digital FROM reportes.vw_cuadre_turno WHERE estado='ABIERTO';
\echo '--- cierre: el cajero cuenta $1 menos en efectivo ---'
SELECT jsonb_pretty(pos.fn_cerrar_turno((SELECT id_turno FROM pos.turnos_caja WHERE estado='ABIERTO'), 47.75, 0.00, 9.25)) AS resultado_cierre;

\echo '=== 13. COMPRA a crédito (café + leche) => entra stock y se recalcula el costo promedio ==='
SELECT costo_promedio AS costo_cafe_antes FROM inventario.insumos WHERE nombre='Café Grano Especialidad';
SELECT compras.fn_registrar_compra(1,1,'CCF-00045','2026-11-02','CREDITO',
  jsonb_build_array(jsonb_build_object('id_insumo',:i_cafe,'cantidad',10000,'costo_unitario',0.0400), jsonb_build_object('id_insumo',:i_leche,'cantidad',20000,'costo_unitario',0.0012)),
  (SELECT id_usuario FROM seguridad.usuarios WHERE username='bodega1')) AS id_compra \gset c_
SELECT costo_promedio AS costo_cafe_despues FROM inventario.insumos WHERE nombre='Café Grano Especialidad';
SELECT stock_actual AS stock_cafe_suc1 FROM inventario.stock_sucursal WHERE id_sucursal=1 AND id_insumo=:i_cafe;
SELECT proveedor, num_factura, fecha_vencimiento, total, pagado, saldo, estado_pago FROM reportes.vw_cuentas_por_pagar;
\echo '--- pago parcial de $100 ---'
INSERT INTO compras.pagos_proveedor(id_compra, monto, metodo, referencia) VALUES (:'c_id_compra', 100.00, 'TRANSFERENCIA', 'TRF-9981');
SELECT proveedor, total, pagado, saldo, estado_pago FROM reportes.vw_cuentas_por_pagar;

\echo '=== 14. PLANILLA quincenal sucursal 1 (ISSS 3% tope, AFP 7.25%, Renta por tramos) ==='
INSERT INTO rrhh.planillas(id_sucursal, periodo_inicio, periodo_fin, tipo_periodo) VALUES (1,'2026-11-01','2026-11-15','QUINCENAL');
SELECT rrhh.fn_calcular_planilla(1) AS empleados_calculados;
SELECT e.nombres, d.salario_bruto, d.isss_laboral, d.afp_laboral, d.renta_retenida, d.total_descuentos, d.salario_neto, d.isss_patronal+d.afp_patronal+d.insaforp_patronal AS aporte_patronal
FROM rrhh.planilla_detalles d JOIN rrhh.empleados e USING(id_empleado) ORDER BY d.salario_bruto DESC;

\echo '=== 15. MERMA (se dañaron 420 vasos) => dispara ALERTA de stock mínimo ==='
SELECT inventario.fn_registrar_merma(1, :i_vaso16, 420, 'Caja de vasos dañada por humedad', (SELECT id_usuario FROM seguridad.usuarios WHERE username='gerente1'));
SELECT sucursal, insumo, stock_actual, stock_minimo, faltante, nivel FROM reportes.vw_alertas_stock;
\echo '=== 15b. REPORTES: margen por producto y dashboard ==='
SELECT nombre, precio_venta, precio_sin_iva, costo_receta, ROUND(precio_sin_iva-costo_receta,2) AS margen FROM reportes.vw_costo_margen_producto WHERE nombre IN ('Latte Grande','Espresso','Frappé de Café Grande','Galleta de Avena') ORDER BY nombre;
SELECT * FROM reportes.vw_ventas_diarias;

\echo '=== 16. BITÁCORA: cambio de precio queda registrado ==='
SELECT set_config('app.user_id', (SELECT id_usuario::text FROM seguridad.usuarios WHERE username='admin'), false);
UPDATE inventario.productos SET precio_venta = 3.95 WHERE nombre='Latte Grande';
SELECT accion, entidad, datos_antes->>'precio_venta' AS precio_antes, datos_despues->>'precio_venta' AS precio_nuevo FROM seguridad.bitacora WHERE entidad='inventario.productos' ORDER BY id_bitacora DESC LIMIT 1;
