# DB_MAP — mapa compacto de la BD (para NO leer el schema completo). Fuente real: database/init/01_schema.sql
PostgreSQL 16. Esquemas: seguridad, empresa, inventario, pos, compras, rrhh, reportes (vistas). PK uuid donde se indica (U).

Conexión: `web_user` es el rol global restringido de la aplicación; `POSTGRES_USER` se reserva para inicialización y migraciones administrativas.

Control operativo: `public.schema_migrations(nombre, aplicado_en, checksum, tipo)` registra migraciones y seeders aplicados por `scripts/db.js`.

## seguridad
roles(id_rol, nombre*, descripcion, es_sistema, activo, creado_en, modificado_en, deleted_at; unicidad de nombre solo con deleted_at IS NULL) · permisos(id_permiso, codigo*, modulo, descripcion)
roles_permisos(id_rol, id_permiso) · usuarios(id_usuario U, id_rol, username*, password_hash, activo, ultimo_login, creado_en, modificado_en, deleted_at) [soft-delete: deleted_at IS NOT NULL = oculto]
usuario_sucursal(id_usuario, id_sucursal) · bitacora(id_bitacora, id_usuario, accion, entidad, datos_antes, datos_despues, creado_en, ip_cliente, agente_cliente, severidad) [trigger en productos, recetas, roles_permisos, usuarios; columnas analíticas en migración 006] · tokens_revocados(jti*, id_usuario, expiracion, revocado_en) [migración 011 / init 14]
fn: seguridad.fn_tiene_permiso(id_usuario, codigo) → bool

## empresa
sucursales(id_sucursal, codigo_establecimiento*, nombre, direccion, departamento, telefono, activa) · parametros(clave, valor, descripcion)
claves: tasa_iva, isss_empleado, isss_patronal, isss_base_maxima_mensual, afp_empleado, afp_patronal, insaforp_patronal, permitir_stock_negativo
fn: empresa.fn_param(clave) → text

## inventario
unidades_medida(id_unidad, codigo*, nombre, factor_conversion, activo, deleted_at, modificado_en) · categorias_producto(id_categoria, nombre)
insumos(id_insumo, nombre*, tipo_insumo[INGREDIENTE|EMPAQUE|REVENTA], id_unidad_base, costo_promedio, activo)
stock_sucursal(id_sucursal, id_insumo, stock_actual, stock_minimo)
productos(id_producto, id_categoria, nombre*, codigo_barra, precio_venta[CON IVA], es_elaborado, id_insumo_reventa, activo)
recetas(id_producto, id_insumo, cantidad_requerida) · movimientos_inventario(id_movimiento, id_sucursal, id_insumo, tipo, cantidad±, costo_unitario, stock_resultante, referencia_tipo, referencia_id, motivo, id_usuario)
fn: inventario.fn_mover_stock(suc, insumo, cant±, tipo, ref_tipo, ref_id, usuario, costo, motivo) · fn_descontar_stock_por_venta · fn_revertir_stock_venta(id_venta, usuario) · fn_registrar_merma(suc, insumo, cant, motivo, usuario)

## pos
cajas(id_caja, id_sucursal, codigo_punto_venta, nombre_identificador) · turnos_caja(id_turno U, id_caja, id_usuario, monto_apertura, monto_cierre_*, esperado_*, dif_*, estado[ABIERTO|CERRADO]) [1 turno abierto por caja y por usuario]
movimientos_caja(id_movimiento, id_turno, tipo[INGRESO|EGRESO], concepto, monto, id_usuario) · clientes(id_cliente, nombre_razon_social, tipo_documento, num_documento, nrc, giro_economico, direccion, email, telefono, username, password_hash, activo)
series_documento(id_caja, tipo_comprobante, ultimo_numero) · ordenes(id_orden, id_turno, id_caja, id_sucursal, id_cliente, canal, etiqueta, estado, motivo_anulacion) [mig. 022: id_caja/id_sucursal los fija trg_ordenes_ubicacion desde el turno] · orden_detalles(id_detalle, id_orden, id_producto, cantidad, precio_unitario, nota) [índices: orden_detalles(id_orden,id_detalle); cola activa ordenada por creado_en/id_orden, cubre id_turno]
ventas(id_venta U, id_turno, id_caja, id_sucursal, id_usuario, id_cliente, id_orden, tipo_comprobante[FCF|CCF], correlativo, numero_control, codigo_generacion, sello_recepcion, estado_dte, subtotal, descuento, iva, total, estado[EMITIDA|ANULADA], motivo_anulacion)
venta_detalles(id_detalle, id_venta, id_producto, cantidad, precio_unitario, subtotal_linea, nota) · pagos(id_pago, id_venta, metodo[EFECTIVO|TARJETA|BITCOIN_CHIVO|TRANSFERENCIA], monto, monto_recibido, referencia)
fn: pos.fn_registrar_venta(id_turno, tipo, id_cliente, items jsonb, pagos jsonb, descuento, id_orden) → id_venta (mig. 022: sin id_orden crea orden ABIERTA solo con ítems es_elaborado y la liga en ventas.id_orden; con id_orden solo marca FACTURADA si ya está ENTREGADA; fn_anular_venta anula la orden pendiente)
    items=[{id_producto,cantidad,nota}] pagos=[{metodo,monto,monto_recibido,referencia}] · pos.fn_anular_venta(id_venta, motivo, id_usuario) · pos.fn_cerrar_turno(id_turno, efectivo, tarjeta, digital, bitcoin) → jsonb (digital=TRANSFERENCIA, bitcoin=BITCOIN_CHIVO; mig. 019) · pagos.referencia: comprobante obligatorio no-efectivo (TARJETA 6-12 dígitos, TRANSFERENCIA 6-30 A-Z0-9-, BITCOIN_CHIVO 8-100 alfanum.) · pos.fn_siguiente_correlativo(id_caja, tipo)

## compras
proveedores(id_proveedor, razon_social, nrc, nit, contacto, telefono, dias_credito, activo, deleted_at, modificado_en) [facturas conservan FK; bitácora por migración 008] · facturas_compra(id_compra U, id_proveedor, id_sucursal, id_usuario, num_factura, tipo_costo[COSTO|GASTO], fecha_emision, condicion_pago, fecha_vencimiento, subtotal, iva_credito, total, estado_pago)
compra_detalles(id_detalle, id_compra, id_insumo?, descripcion, cantidad, costo_unitario [sin IVA], costo_unitario_con_iva [nullable para históricos], subtotal) [trigger: entra stock con costo sin IVA + costo promedio] · pagos_proveedor(id_pago, id_compra, fecha_pago, monto, metodo, referencia, id_usuario) [trigger: actualiza estado_pago]
fn: compras.fn_registrar_compra(id_proveedor, id_sucursal, num_factura, fecha, condicion, items jsonb, id_usuario, tipo_costo, tipo_documento CCF|CF|FSE) → id_compra   items=[{id_insumo,cantidad,costo_unitario}] ó [{descripcion,cantidad,costo_unitario}] (JSON costo_unitario CON IVA; subtotal/IVA redondeados por línea); solo CCF separa iva_credito, CF/FSE costean el precio completo (018). Vista reportes.vw_productos_margen_bajo + parámetro margen_minimo
Columna `costo_unitario_con_iva` introducida por `database/migrations/017_compras_costos_con_iva.sql` / `database/init/19_compras_costos_con_iva.sql`; nullable para históricos, sin alterar sus importes.

## rrhh
puestos(id_puesto, nombre, salario_base, activo) · empleados(id_empleado U, id_sucursal, id_puesto, id_usuario?, nombres, apellidos, dui*, nit nullable si está homologado con DUI, fecha_ingreso, salario_nominal[MENSUAL], activo) · CRUD REST en `/api/rrhh` protegido por `RRHH_GESTIONAR_EMPLEADOS`
tramos_renta(tipo_periodo, tramo, desde, hasta, cuota_fija, porcentaje, exceso_sobre, vigencia_desde, vigencia_hasta) · parametros_legales(vigencias, AFP/ISSS/INSAFORP y fuente) · planillas(id_planilla, id_sucursal, tipo_periodo[QUINCENAL|MENSUAL], periodo sin traslape (trigger), id_parametro_legal, procesada) · planilla_ajustes(bonificaciones, otros_descuentos, detalle JSONB) · planilla_detalles(salario_bruto, bonificaciones, ISSS/AFP laboral, renta, otros_descuentos, neto, aportes patronales)
fn: rrhh.fn_calcular_planilla(id_planilla) → nº empleados; quincenal liquida salario/2 con tope ISSS/2 y tramos QUINCENAL (mig. 019). API/PDF protegidos por RRHH_CALCULAR_PLANILLA y RRHH_VER_PLANILLA.

## reportes (vistas)
vw_alertas_stock (única regla: mínimo > 0 y stock_actual < stock_minimo; faltante no negativo; expone id_sucursal/id_insumo) · vw_costo_margen_producto · vw_cuadre_turno · vw_ventas_diarias · vw_top_productos · vw_cuentas_por_pagar · vw_permisos_usuario(id_usuario, username, rol, modulo, permiso)

## Permisos (códigos)
SEG_GESTIONAR_USUARIOS SEG_GESTIONAR_ROLES SEG_VER_BITACORA · EMP_GESTIONAR_SUCURSALES EMP_EDITAR_PARAMETROS · INV_VER_STOCK INV_VER_KARDEX INV_GESTIONAR_INSUMOS INV_GESTIONAR_PRODUCTOS INV_GESTIONAR_RECETAS INV_REGISTRAR_MERMA INV_VER_COSTOS
POS_CREAR_ORDEN POS_VER_COLA_PREPARACION POS_COBRAR POS_EMITIR_CCF POS_APLICAR_DESCUENTO POS_ANULAR_VENTA POS_GESTIONAR_CLIENTES · CAJA_ABRIR_TURNO CAJA_CERRAR_TURNO CAJA_MOVIMIENTOS CAJA_VER_CUADRES
COM_GESTIONAR_PROVEEDORES COM_REGISTRAR_COMPRA COM_PAGAR_PROVEEDOR COM_VER_CXP · RRHH_GESTIONAR_EMPLEADOS RRHH_VER_SALARIOS RRHH_CALCULAR_PLANILLA RRHH_VER_PLANILLA · REP_VER_DASHBOARD
Roles semilla: ADMIN, GERENTE_SUCURSAL, CAJERO, BARISTA, BODEGUERO, CONTADOR, RRHH (+ SUPERVISOR_ZONAL del seed). `pnpm seed:reset` crea 24 usuarios demo (admin, gerente1-3, supervisor1, cajero1-11, barista1-4, bodega1-2, contador1, rrhh1; pass Cambiar123*), 3 sucursales (M001 Escalón, M002 Santa Tecla, M003 Centro) y 5 cajas.
`INV_VER_KARDEX` se incorpora mediante `database/migrations/012_permisos_kardex.sql` / `database/init/10_permisos_kardex.sql` (y seeder 003) para ADMIN, GERENTE_SUCURSAL y BODEGUERO.
