# Endpoints implementados

Todas las respuestas de error usan `{ "error": "texto" }`, con `detalles` adicional para validaciones.

| Método | Ruta | Autenticación | Permiso | Cuerpo | Respuestas principales |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | No | — | `{username,password}` | 200; 400; 401; 429 |
| POST | `/api/auth/cliente/login` | No | — | `{username,password}` | 200; 400; 401; 429 |
| POST | `/api/auth/logout` | Cookie JWT | — | — | 204; 401 |
| GET | `/api/auth/me` | Cookie JWT + tipo admin | — | — | 200; 401; 403 |
| GET | `/api/auth/cliente/me` | Cookie JWT + tipo cliente | — | — | 200; 401; 403 |
| GET | `/api/seguridad/usuarios` | Cookie JWT + tipo admin | `SEG_GESTIONAR_USUARIOS` | — | 200; 401; 403 |
| GET | `/api/seguridad/roles` | Cookie JWT + tipo admin | `SEG_GESTIONAR_USUARIOS` o `SEG_GESTIONAR_ROLES` | — | 200; 401; 403 |
| POST | `/api/seguridad/roles` | Cookie JWT + tipo admin | `SEG_GESTIONAR_ROLES` | `{nombre,descripcion?}` | 201; 400; 401; 403; 409 |
| PUT | `/api/seguridad/roles/:id` | Cookie JWT + tipo admin | `SEG_GESTIONAR_ROLES` | `{nombre,descripcion?}` | 200; 400; 401; 403; 404; 409 |
| DELETE | `/api/seguridad/roles/:id` | Cookie JWT + tipo admin | `SEG_GESTIONAR_ROLES` | — | 204; 401; 403; 404; 409 |
| GET | `/api/seguridad/permisos` | Cookie JWT + tipo admin | `SEG_GESTIONAR_ROLES` | — | 200; 401; 403 |
| POST | `/api/seguridad/permisos` | Cookie JWT + tipo admin | `SEG_GESTIONAR_ROLES` | `{codigo,modulo,descripcion?}` | 201; 400; 401; 403; 409 |
| PUT | `/api/seguridad/permisos/:id` | Cookie JWT + tipo admin | `SEG_GESTIONAR_ROLES` | `{codigo,modulo,descripcion?}` | 200; 400; 401; 403; 404; 409 |
| DELETE | `/api/seguridad/permisos/:id` | Cookie JWT + tipo admin | `SEG_GESTIONAR_ROLES` | — | 204; 401; 403; 404; 409 |
| GET | `/api/seguridad/roles/:id/permisos` | Cookie JWT + tipo admin | `SEG_GESTIONAR_ROLES` | — | 200; 401; 403; 404 |
| PUT | `/api/seguridad/roles/:id/permisos` | Cookie JWT + tipo admin | `SEG_GESTIONAR_ROLES` | `{idPermisos:number[]}` | 200; 400; 401; 403; 404; 409 |
| POST | `/api/seguridad/roles/:id/permisos/:idPermiso` | Cookie JWT + tipo admin | `SEG_GESTIONAR_ROLES` | — | 201; 400; 401; 403; 404; 409 |
| DELETE | `/api/seguridad/roles/:id/permisos/:idPermiso` | Cookie JWT + tipo admin | `SEG_GESTIONAR_ROLES` | — | 204; 401; 403; 404 |
| GET | `/api/seguridad/sucursales` | Cookie JWT + tipo admin | `SEG_GESTIONAR_USUARIOS` | — | 200; 401; 403 |
| POST | `/api/seguridad/usuarios` | Cookie JWT + tipo admin | `SEG_GESTIONAR_USUARIOS` | `{username,password,idRol,sucursales[]}` | 201; 400; 401; 403; 409 |
| PUT | `/api/seguridad/usuarios/:id` | Cookie JWT + tipo admin | `SEG_GESTIONAR_USUARIOS` | `{username,password?,idRol,sucursales[]}` | 200; 400; 401; 403; 404; 409 |
| DELETE | `/api/seguridad/usuarios/:id` | Cookie JWT + tipo admin | `SEG_GESTIONAR_USUARIOS` | — | 204; 401; 403; 404 |
| GET | `/api/cajas` | Cookie JWT + tipo admin | `CAJA_ABRIR_TURNO` | — | 200; 401; 403 |
| GET | `/api/turnos/actual` | Cookie JWT + tipo admin | `CAJA_ABRIR_TURNO` o `CAJA_MOVIMIENTOS` | — | 200; 401; 403; 404 |
| POST | `/api/turnos` | Cookie JWT + tipo admin | `CAJA_ABRIR_TURNO` | `{idCaja,montoApertura}` | 201; 400; 401; 403; 404; 409 |
| GET | `/api/turnos/:idTurno/movimientos` | Cookie JWT + tipo admin | `CAJA_MOVIMIENTOS` o `CAJA_VER_CUADRES` | — | 200; 400; 401; 403; 404 |
| POST | `/api/turnos/:idTurno/movimientos` | Cookie JWT + tipo admin | `CAJA_MOVIMIENTOS` | `{tipo:INGRESO\|EGRESO,concepto,monto}` | 201; 400; 401; 403; 404; 409 |
| GET | `/api/turnos/cuadres` | Cookie JWT + tipo admin | `CAJA_VER_CUADRES` | query: `estado?,desde?,hasta?,idSucursal?` | 200; 400; 401; 403 |
| POST | `/api/turnos/:idTurno/cierre` | Cookie JWT + tipo admin | `CAJA_CERRAR_TURNO` | `{efectivo,tarjeta,digital}` | 200; 400; 401; 403; 404; 409 |
| GET | `/api/turnos/:idTurno/cuadre` | Cookie JWT + tipo admin | `CAJA_CERRAR_TURNO` o `CAJA_VER_CUADRES` | — | 200; 400; 401; 403; 404 |
| GET | `/api/reportes/ventas-diarias` | Cookie JWT + tipo admin | `REP_VER_DASHBOARD` | query: `desde?,hasta?,idSucursal?` | 200; 400; 401; 403 |
| GET | `/api/reportes/top-productos` | Cookie JWT + tipo admin | `REP_VER_DASHBOARD` | query: `desde?,hasta?,idSucursal?,limite?` | 200; 400; 401; 403 |
| GET | `/api/reportes/ventas-por-metodo-pago` | Cookie JWT + tipo admin | `REP_VER_DASHBOARD` | query: `desde?,hasta?,idSucursal?` | 200; 400; 401; 403 |
| GET | `/api/reportes/alertas-stock` | Cookie JWT + tipo admin | `REP_VER_DASHBOARD` | query: `idSucursal?,nivel?` | 200; 400; 401; 403 |
| GET | `/api/reportes/margen-productos` | Cookie JWT + tipo admin | `REP_VER_DASHBOARD` + `INV_VER_COSTOS` | — | 200; 401; 403 |
| GET | `/api/reportes/cuadre-turnos` | Cookie JWT + tipo admin | `REP_VER_DASHBOARD` + `CAJA_VER_CUADRES` | query: `desde?,hasta?,idSucursal?` | 200; 400; 401; 403 |
| GET | `/api/reportes/cuentas-por-pagar` | Cookie JWT + tipo admin | `REP_VER_DASHBOARD` + `COM_VER_CXP` | query: `desde?,hasta?,idSucursal?` | 200; 400; 401; 403 |
| GET | `/api/preparacion/cola` | Cookie JWT + tipo admin | `POS_VER_COLA_PREPARACION` | query: `idSucursal?` | 200; 400; 401; 403 |
| PATCH | `/api/preparacion/ordenes/:idOrden/estado` | Cookie JWT + tipo admin | `POS_VER_COLA_PREPARACION` | `{estado: EN_PREPARACION\|LISTA\|ENTREGADA}` | 200; 400; 401; 403; 404; 409 |
| GET/POST | `/api/inventario/unidades` | Cookie JWT + tipo admin | `INV_GESTIONAR_INSUMOS` | `{codigo,nombre}` | 200/201; 400; 401; 403; 409 |
| PUT/DELETE | `/api/inventario/unidades/:id` | Cookie JWT + tipo admin | `INV_GESTIONAR_INSUMOS` | PUT `{codigo,nombre}` | 200/204; 400; 401; 403; 404; 409 |
| GET/POST | `/api/rrhh/puestos` | Cookie JWT + tipo admin | `RRHH_GESTIONAR_EMPLEADOS` | `{nombre,salarioBase}` para POST | 200/201; 400; 401; 403; 409 |
| PUT/DELETE/PATCH | `/api/rrhh/puestos/:id` | Cookie JWT + tipo admin | `RRHH_GESTIONAR_EMPLEADOS` | PUT `{nombre,salarioBase}`; PATCH `/activar` | 200/204; 400; 401; 403; 404; 409 |
| GET/POST | `/api/rrhh/empleados` | Cookie JWT + tipo admin | `RRHH_GESTIONAR_EMPLEADOS` | `{idSucursal,idPuesto,nombres,apellidos,dui,nit?,fechaIngreso,salarioNominal}`; `nit` puede ser `null` si está homologado con DUI | 200/201; 400; 401; 403; 409 |
| PUT/DELETE/PATCH | `/api/rrhh/empleados/:id` | Cookie JWT + tipo admin | `RRHH_GESTIONAR_EMPLEADOS` | PUT datos del empleado; PATCH `/activar` | 200/204; 400; 401; 403; 404; 409 |
| GET/POST | `/api/compras/proveedores` | Cookie JWT + tipo admin | `COM_GESTIONAR_PROVEEDORES` | GET `?activo=true\|false`; POST `{razonSocial,nrc,nit,contacto?,telefono?,diasCredito}` | 200/201; 400; 401; 403 |
| PUT/DELETE | `/api/compras/proveedores/:id` | Cookie JWT + tipo admin | `COM_GESTIONAR_PROVEEDORES` | PUT mismo body del POST; DELETE desactiva (`activo=false`) | 200/204; 400; 401; 403; 404; 409 |
| POST | `/api/compras` | Cookie JWT + tipo admin | `COM_REGISTRAR_COMPRA` | COSTO: `{idProveedor,idSucursal,numeroFactura,fechaEmision,condicionPago,tipoCosto?,items:[{idInsumo,cantidad,costoUnitario}]}`; GASTO: mismos campos con `tipoCosto:"GASTO"` e `items:[{descripcion,cantidad,costoUnitario}]` | 201; 400; 401; 403; 404; 409 |
| GET | `/api/compras/cuentas-por-pagar` | Cookie JWT | `COM_VER_CXP` | query: `desde?,hasta?,idSucursal?` | 200; 400; 401; 403 |
| POST | `/api/compras/:id/pagos` | Cookie JWT + tipo admin | `COM_PAGAR_PROVEEDOR` | `{monto:"500.00",metodo:EFECTIVO\|TRANSFERENCIA\|CHEQUE\|TARJETA,referencia?}` | 201; 400; 401; 403; 404; 409 |
| GET/POST | `/api/inventario/insumos` | Cookie JWT + tipo admin | `INV_VER_STOCK`, `INV_GESTIONAR_INSUMOS` o `INV_VER_COSTOS` para GET; `INV_GESTIONAR_INSUMOS` para POST | `{nombre,tipoInsumo,idUnidadBase,costoPromedio,activo?}` | 200/201; 400; 401; 403; 409 |
| PUT/DELETE | `/api/inventario/insumos/:id` | Cookie JWT + tipo admin | `INV_GESTIONAR_INSUMOS` | PUT mismo cuerpo de POST | 200/204; 400; 401; 403; 404; 409 |
| GET/POST | `/api/inventario/productos` | Cookie JWT + tipo admin | GET `INV_VER_STOCK` o `INV_GESTIONAR_PRODUCTOS`; POST `INV_GESTIONAR_PRODUCTOS` | `{idCategoria?,nombre,codigoBarra?,precioVenta,esElaborado,idInsumoReventa?,activo?}` | 200/201; 400; 401; 403; 409 |
| PUT/DELETE | `/api/inventario/productos/:id` | Cookie JWT + tipo admin | `INV_GESTIONAR_PRODUCTOS` | PUT mismo cuerpo de POST | 200/204; 400; 401; 403; 404; 409 |
| GET/PUT | `/api/inventario/productos/:id/receta` | Cookie JWT + tipo admin | GET `INV_VER_STOCK` o `INV_GESTIONAR_RECETAS`; PUT `INV_GESTIONAR_RECETAS` | `{componentes:[{idInsumo,cantidadRequerida}]}` | 200; 400; 401; 403; 404; 409 |
| GET | `/api/inventario/stock`, `/api/inventario/alertas` | Cookie JWT + tipo admin | `INV_VER_STOCK` | Filtro query opcional `idSucursal` | 200; 400; 401; 403 |
| GET | `/api/inventario/movimientos` | Cookie JWT + tipo admin | `INV_VER_KARDEX`; `costo_unitario` requiere además `INV_VER_COSTOS` | Filtros query opcionales `idSucursal`, `idInsumo`; máximo 500 movimientos | 200; 400; 401; 403 |
| PATCH | `/api/inventario/insumos/:id/stock-minimo` | Cookie JWT + tipo admin | `INV_GESTIONAR_INSUMOS` | `{idSucursal,stockMinimo}` | 200; 400; 401; 403; 404 |
| POST | `/api/inventario/insumos/:id/movimientos` | Cookie JWT + tipo admin | `INV_GESTIONAR_INSUMOS` | `{idSucursal,cantidad,tipo,motivo}` | 201; 400; 401; 403; 404; 409 |
| POST | `/api/inventario/insumos/:id/mermas` | Cookie JWT + tipo admin | `INV_REGISTRAR_MERMA` | `{idSucursal,cantidad,motivo}` | 201; 400; 401; 403; 404; 409 |

Un token de cliente nunca alcanza el middleware de permisos de administración: `requireTipo('admin')` devuelve 403 antes de consultar permisos. Un usuario desactivado recibe 401 aunque el JWT siga vigente.

Caja: un solo turno `ABIERTO` por caja y por cajero (409; lo garantizan los índices únicos de la BD). Solo el cajero dueño del turno registra movimientos y solo en turnos abiertos; un `EGRESO` mayor al efectivo esperado devuelve 409. Los montos viajan como número o texto con máximo 2 decimales y se devuelven como string.

Inventario: cada escritura se ejecuta con `withTransaction` y `app.user_id`; cambios de existencias y mermas llaman las funciones SQL existentes para serializar el stock y dejar kardex. Las consultas operativas filtran sucursales asignadas. El costo promedio requiere `INV_VER_COSTOS`; `costo_unitario` del Kárdex requiere conjuntamente `INV_VER_KARDEX` y `INV_VER_COSTOS`. `/api/inventario/movimientos` devuelve hasta 500 movimientos recientes después de aplicar el aislamiento por sucursal. El esquema inicial ya incluye 12 productos elaborados, 3 de reventa y sus recetas.

Proveedores: los bodies y filtros inválidos responden 400; la edición y desactivación de IDs inexistentes responden 404, y desactivar uno ya inactivo responde 409. El listado excluye `deleted_at` y devuelve activos e inactivos salvo filtro `activo`; no se impone unicidad a NRC/NIT porque la BD no la define. No hay endpoint de reactivación en T30; desactivar conserva filas y referencias de facturas. Las altas, ediciones y desactivaciones dejan bitácora cuando se aplica `008_compras_bitacora_proveedores.sql`. El frontend de proveedores sigue siendo provisional.

Registro de factura de compra (T31/T33): `POST /api/compras` exige autenticación admin y `COM_REGISTRAR_COMPRA`. Los campos comunes son `idProveedor` e `idSucursal` enteros positivos, `numeroFactura` de hasta 50 caracteres, `fechaEmision` calendario `AAAA-MM-DD` y `condicionPago` `CONTADO` o `CREDITO`. Si se omite `tipoCosto`, se asume `COSTO`; COSTO requiere en cada detalle `idInsumo` entero positivo. GASTO exige `tipoCosto:"GASTO"`, una o más líneas con `descripcion` no vacía de hasta 150 caracteres y prohíbe `idInsumo`. En ambos tipos, `cantidad` es string decimal positiva (hasta 8 enteros y 4 decimales) y `costoUnitario` es string decimal no negativo (hasta 6 enteros y 6 decimales). La respuesta es HTTP 201 `{ "id_compra": "uuid" }`; los errores de validación son 400, falta de sesión 401, falta de permiso 403, referencias inexistentes 404, referencias inactivas 409 y factura duplicada 409. PostgreSQL calcula subtotal, IVA, total y vencimiento mediante `compras.fn_registrar_compra`.

En GASTO se transforma cada detalle a `{id_insumo:null,descripcion,cantidad,costo_unitario}`. El trigger existente omite inventario cuando `id_insumo IS NULL`, por lo que no aumenta stock, no actualiza costo promedio ni genera Kardex. No se agregaron tablas, funciones, permisos, rutas, migraciones ni bitácora. Las facturas GASTO permanecen en `compras.facturas_compra` y son compatibles con los pagos T32; no se implementó frontend funcional.

Ejemplo de compra GASTO:

```json
{
  "idProveedor": 1,
  "idSucursal": 1,
  "numeroFactura": "GAS-001",
  "fechaEmision": "2026-11-13",
  "condicionPago": "CONTADO",
  "tipoCosto": "GASTO",
  "items": [
    { "descripcion": "Servicio de electricidad", "cantidad": "1", "costoUnitario": "185.40" }
  ]
}
```

Pagos a proveedores y consulta operativa (T32): `GET /api/compras/cuentas-por-pagar` requiere únicamente `COM_VER_CXP` y comparte la consulta SQL con Reportes; acepta filtros opcionales `desde`, `hasta` e `idSucursal`. `POST /api/compras/:id/pagos` requiere `COM_PAGAR_PROVEEDOR`, UUID y body `{monto:"500.00",metodo:"TRANSFERENCIA",referencia:"TRF-001"}`. `monto` es string decimal positivo con hasta dos decimales; se aceptan EFECTIVO, TRANSFERENCIA, CHEQUE o TARJETA y `referencia` opcional de hasta 100 caracteres. No se acepta fecha de pago; PostgreSQL usa `CURRENT_DATE`. Se permiten pagos parciales y pagos sucesivos sobre facturas CONTADO o CREDITO; las facturas PAGADAS se rechazan. La factura se bloquea con `FOR UPDATE` dentro de `withTransaction`; el trigger existente valida saldo y actualiza estado. La respuesta 201 incluye el pago, `estado_pago`, `total_pagado` y `saldo` como strings numéricos. Errores: 400 por datos inválidos, 401 sin autenticación, 403 sin permiso, 404 factura inexistente y 409 factura pagada o sobrepago. No hay edición ni anulación de pagos; no se añadió bitácora, tabla ni migración para T32.

```json
{
  "idProveedor": 1,
  "idSucursal": 1,
  "numeroFactura": "FAC-001-2026",
  "fechaEmision": "2026-11-12",
  "condicionPago": "CREDITO",
  "tipoCosto": "COSTO",
  "items": [
    { "idInsumo": 3, "cantidad": "50.0000", "costoUnitario": "1.250000" }
  ]
}
```

Con éxito devuelve `201` y JSON directo `{ "id_compra": "<UUID>" }`. Devuelve `400` para validación o regla SQL, `401` sin sesión, `403` sin tipo admin o permiso, `404` si proveedor/sucursal/insumo no existe o está eliminado, `409` si una referencia está inactiva o el número de factura ya existe para ese proveedor. El service comprueba proveedor y sucursal dentro de la transacción; en COSTO también comprueba insumos activos/no eliminados. Para `CONTADO`, PostgreSQL fija el vencimiento a la fecha de emisión; para `CREDITO`, suma los días de crédito del proveedor. PostgreSQL calcula importes y vencimiento. El trigger de detalle actualiza costo promedio y stock/Kárdex solo para los detalles COSTO con insumo; en GASTO el insumo es `NULL` y el trigger retorna sin afectar inventario. Facturas y detalles no generan bitácora; pagos y CxP corresponden a T32.

El body de alta y edición usa `razonSocial` (1–150 caracteres), `nrc` y `nit` (1–20), `contacto` (opcional, hasta 100), `telefono` (opcional, hasta 20) y `diasCredito` (entero >= 0). Ejemplo:

```json
{
  "razonSocial": "Distribuidora La Central",
  "nrc": "123456-7",
  "nit": "0614-123456-123-1",
  "contacto": "Ana López",
  "telefono": "2222-3333",
  "diasCredito": 30
}
```

GET devuelve un arreglo de objetos con `id_proveedor`, `razon_social`, `nrc`, `nit`, `contacto`, `telefono`, `dias_credito`, `activo` y `modificado_en`; POST devuelve ese mismo objeto con HTTP 201 y PUT con HTTP 200. DELETE responde 204 sin cuerpo y solo cambia `activo`. No hay endpoint de reactivación. Errores: 400 para body, query o ID inválidos; 401 sin sesión; 403 sin tipo admin o permiso; 404 para proveedor inexistente o eliminado; 409 al desactivar uno ya inactivo. NRC/NIT duplicados se aceptan mientras el esquema no establezca restricciones.

Cierre de turno: solo el cajero dueño, una vez (409 si ya está cerrado). Llama a `pos.fn_cerrar_turno`; las diferencias son `contado - esperado` (negativo = FALTANTE). Reportes: sin fechas usan los últimos 30 días; rango máximo 366 días; cada usuario ve solo sus sucursales (el rol ADMIN ve todas). Preparación: el estado solo avanza ABIERTA → EN_PREPARACION → LISTA → ENTREGADA.

## Bitácora y analítica

| Método | Ruta | Autenticación | Permiso | Query params | Respuesta |
|---|---|---|---|---|---|
| GET | `/api/bitacora` | Cookie JWT + tipo admin | `SEG_VER_BITACORA` | `page` (1+), `limit` (1–100), `startDate`, `endDate`, `user`, `action` (CREATE/UPDATE/DELETE/LOGIN), `module`, `search` | `{data, pagination}` ordenado por `creado_en DESC, id_bitacora DESC` |
| GET | `/api/bitacora/metricas` | Cookie JWT + tipo admin | `SEG_VER_BITACORA` | `startDate`, `endDate`, `user`, `module`, `granularity` (hour/day) | `tendencia`, `severidadModulo`, `usuarios`, `heatmap`, `modulos` agrupados en PostgreSQL |

Las fechas deben enviarse juntas y cubren un rango máximo de 366 días; las métricas sin fechas se acotan a los últimos 30 días. El detalle omite `password_hash`, tokens y credenciales históricas. La migración `006_bitacora_analitica.sql` agrega IP, agente y severidad; después debe aplicarse con `pnpm db:migrate`. Los accesos de login fallidos se guardan como `WARNING`; la ventana fuera de horario para analítica es 22:00–05:59, hora de El Salvador.
