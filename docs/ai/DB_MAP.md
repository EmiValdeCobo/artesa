# DB_MAP — mapa compacto de la BD (para NO leer el schema completo). Fuente real: database/init/01_schema.sql
PostgreSQL 16. Esquemas: seguridad, empresa, inventario, pos, compras, rrhh, reportes (vistas). PK uuid donde se indica (U).

## seguridad
roles(id_rol, nombre*, descripcion, es_sistema, activo) · permisos(id_permiso, codigo*, modulo, descripcion)
roles_permisos(id_rol, id_permiso) · usuarios(id_usuario U, id_rol, username*, password_hash, activo, ultimo_login)
usuario_sucursal(id_usuario, id_sucursal) · bitacora(id_bitacora, id_usuario, accion, entidad, datos_antes, datos_despues) [trigger en productos, recetas, roles_permisos, usuarios]
fn: seguridad.fn_tiene_permiso(id_usuario, codigo) → bool

## empresa
sucursales(id_sucursal, codigo_establecimiento*, nombre, direccion, departamento, telefono, activa) · parametros(clave, valor, descripcion)
claves: tasa_iva, isss_empleado, isss_patronal, isss_base_maxima_mensual, afp_empleado, afp_patronal, insaforp_patronal, permitir_stock_negativo
fn: empresa.fn_param(clave) → text

## inventario
unidades_medida(id_unidad, codigo, nombre) · categorias_producto(id_categoria, nombre)
insumos(id_insumo, nombre*, tipo_insumo[INGREDIENTE|EMPAQUE|REVENTA], id_unidad_base, costo_promedio, activo)
stock_sucursal(id_sucursal, id_insumo, stock_actual, stock_minimo)
productos(id_producto, id_categoria, nombre*, codigo_barra, precio_venta[CON IVA], es_elaborado, id_insumo_reventa, activo)
recetas(id_producto, id_insumo, cantidad_requerida) · movimientos_inventario(id_movimiento, id_sucursal, id_insumo, tipo, cantidad±, costo_unitario, stock_resultante, referencia_tipo, referencia_id, motivo, id_usuario)
fn: inventario.fn_mover_stock(suc, insumo, cant±, tipo, ref_tipo, ref_id, usuario, costo, motivo) · fn_descontar_stock_por_venta · fn_revertir_stock_venta(id_venta, usuario) · fn_registrar_merma(suc, insumo, cant, motivo, usuario)

## pos
cajas(id_caja, id_sucursal, codigo_punto_venta, nombre_identificador) · turnos_caja(id_turno U, id_caja, id_usuario, monto_apertura, monto_cierre_*, esperado_*, dif_*, estado[ABIERTO|CERRADO]) [1 turno abierto por caja y por usuario]
movimientos_caja(id_movimiento, id_turno, tipo[INGRESO|EGRESO], concepto, monto, id_usuario) · clientes(id_cliente, nombre_razon_social, tipo_documento, num_documento, nrc, giro_economico, direccion, email, telefono, username, password_hash, activo)
series_documento(id_caja, tipo_comprobante, ultimo_numero) · ordenes(id_orden, id_turno, id_cliente, canal, etiqueta, estado) · orden_detalles(id_detalle, id_orden, id_producto, cantidad, precio_unitario, nota)
ventas(id_venta U, id_turno, id_sucursal, id_usuario, id_cliente, id_orden, tipo_comprobante[FCF|CCF], correlativo, numero_control, codigo_generacion, sello_recepcion, estado_dte, subtotal, descuento, iva, total, estado[EMITIDA|ANULADA], motivo_anulacion)
venta_detalles(id_detalle, id_venta, id_producto, cantidad, precio_unitario, subtotal_linea, nota) · pagos(id_pago, id_venta, metodo[EFECTIVO|TARJETA|BITCOIN_CHIVO|TRANSFERENCIA], monto, monto_recibido, referencia)
fn: pos.fn_registrar_venta(id_turno, tipo, id_cliente, items jsonb, pagos jsonb, descuento, id_orden) → id_venta
    items=[{id_producto,cantidad,nota}] pagos=[{metodo,monto,monto_recibido,referencia}] · pos.fn_anular_venta(id_venta, motivo, id_usuario) · pos.fn_cerrar_turno(id_turno, efectivo, tarjeta, digital) → jsonb · pos.fn_siguiente_correlativo(id_caja, tipo)

## compras
proveedores(id_proveedor, razon_social, nrc, nit, contacto, telefono, dias_credito, activo) · facturas_compra(id_compra U, id_proveedor, id_sucursal, id_usuario, num_factura, tipo_costo[COSTO|GASTO], fecha_emision, condicion_pago, fecha_vencimiento, subtotal, iva_credito, total, estado_pago)
compra_detalles(id_detalle, id_compra, id_insumo?, descripcion, cantidad, costo_unitario, subtotal) [trigger: entra stock + costo promedio] · pagos_proveedor(id_pago, id_compra, fecha_pago, monto, metodo, referencia, id_usuario) [trigger: actualiza estado_pago]
fn: compras.fn_registrar_compra(id_proveedor, id_sucursal, num_factura, fecha, condicion, items jsonb, id_usuario, tipo_costo) → id_compra   items=[{id_insumo,cantidad,costo_unitario}] ó [{descripcion,cantidad,costo_unitario}] (costo SIN IVA)

## rrhh
puestos(id_puesto, nombre, salario_base) · empleados(id_empleado U, id_sucursal, id_puesto, id_usuario?, nombres, apellidos, dui*, nit, fecha_ingreso, salario_nominal[MENSUAL], activo)
tramos_renta(tipo_periodo, tramo, desde, hasta, cuota_fija, porcentaje, exceso_sobre) · planillas(id_planilla, id_sucursal, periodo_inicio, periodo_fin, tipo_periodo, procesada) · planilla_detalles(id_planilla, id_empleado, salario_bruto, isss_laboral, afp_laboral, renta_retenida, total_descuentos, salario_neto, *_patronal)
fn: rrhh.fn_calcular_planilla(id_planilla) → nº empleados (no recalcula si procesada)

## reportes (vistas)
vw_alertas_stock · vw_costo_margen_producto · vw_cuadre_turno · vw_ventas_diarias · vw_top_productos · vw_cuentas_por_pagar · vw_permisos_usuario(id_usuario, username, rol, modulo, permiso)

## Permisos (códigos)
SEG_GESTIONAR_USUARIOS SEG_GESTIONAR_ROLES SEG_VER_BITACORA · EMP_GESTIONAR_SUCURSALES EMP_EDITAR_PARAMETROS · INV_VER_STOCK INV_GESTIONAR_INSUMOS INV_GESTIONAR_PRODUCTOS INV_GESTIONAR_RECETAS INV_REGISTRAR_MERMA INV_VER_COSTOS
POS_CREAR_ORDEN POS_VER_COLA_PREPARACION POS_COBRAR POS_EMITIR_CCF POS_APLICAR_DESCUENTO POS_ANULAR_VENTA POS_GESTIONAR_CLIENTES · CAJA_ABRIR_TURNO CAJA_CERRAR_TURNO CAJA_MOVIMIENTOS CAJA_VER_CUADRES
COM_GESTIONAR_PROVEEDORES COM_REGISTRAR_COMPRA COM_PAGAR_PROVEEDOR COM_VER_CXP · RRHH_GESTIONAR_EMPLEADOS RRHH_VER_SALARIOS RRHH_CALCULAR_PLANILLA RRHH_VER_PLANILLA · REP_VER_DASHBOARD
Roles semilla: ADMIN, GERENTE_SUCURSAL, CAJERO, BARISTA, BODEGUERO, CONTADOR, RRHH. Usuarios demo: admin, gerente1, cajero1, barista1, bodega1 (pass Cambiar123*).
