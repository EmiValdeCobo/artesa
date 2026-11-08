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
| GET/POST | `/api/inventario/unidades` | Cookie JWT + tipo admin | `INV_GESTIONAR_INSUMOS` | `{codigo,nombre}` | 200/201; 400; 401; 403; 409 |
| PUT/DELETE | `/api/inventario/unidades/:id` | Cookie JWT + tipo admin | `INV_GESTIONAR_INSUMOS` | PUT `{codigo,nombre}` | 200/204; 400; 401; 403; 404; 409 |
| GET/POST | `/api/inventario/insumos` | Cookie JWT + tipo admin | `INV_VER_STOCK`, `INV_GESTIONAR_INSUMOS` o `INV_VER_COSTOS` para GET; `INV_GESTIONAR_INSUMOS` para POST | `{nombre,tipoInsumo,idUnidadBase,costoPromedio,activo?}` | 200/201; 400; 401; 403; 409 |
| PUT/DELETE | `/api/inventario/insumos/:id` | Cookie JWT + tipo admin | `INV_GESTIONAR_INSUMOS` | PUT mismo cuerpo de POST | 200/204; 400; 401; 403; 404; 409 |
| GET/POST | `/api/inventario/productos` | Cookie JWT + tipo admin | GET `INV_VER_STOCK` o `INV_GESTIONAR_PRODUCTOS`; POST `INV_GESTIONAR_PRODUCTOS` | `{idCategoria?,nombre,codigoBarra?,precioVenta,esElaborado,idInsumoReventa?,activo?}` | 200/201; 400; 401; 403; 409 |
| PUT/DELETE | `/api/inventario/productos/:id` | Cookie JWT + tipo admin | `INV_GESTIONAR_PRODUCTOS` | PUT mismo cuerpo de POST | 200/204; 400; 401; 403; 404; 409 |
| GET/PUT | `/api/inventario/productos/:id/receta` | Cookie JWT + tipo admin | GET `INV_VER_STOCK` o `INV_GESTIONAR_RECETAS`; PUT `INV_GESTIONAR_RECETAS` | `{componentes:[{idInsumo,cantidadRequerida}]}` | 200; 400; 401; 403; 404; 409 |
| GET | `/api/inventario/stock`, `/api/inventario/alertas`, `/api/inventario/movimientos` | Cookie JWT + tipo admin | `INV_VER_STOCK` | Filtros query opcionales `idSucursal`, `idInsumo` | 200; 400; 401; 403 |
| PATCH | `/api/inventario/insumos/:id/stock-minimo` | Cookie JWT + tipo admin | `INV_GESTIONAR_INSUMOS` | `{idSucursal,stockMinimo}` | 200; 400; 401; 403; 404 |
| POST | `/api/inventario/insumos/:id/movimientos` | Cookie JWT + tipo admin | `INV_GESTIONAR_INSUMOS` | `{idSucursal,cantidad,tipo,motivo}` | 201; 400; 401; 403; 404; 409 |
| POST | `/api/inventario/insumos/:id/mermas` | Cookie JWT + tipo admin | `INV_REGISTRAR_MERMA` | `{idSucursal,cantidad,motivo}` | 201; 400; 401; 403; 404; 409 |

Un token de cliente nunca alcanza el middleware de permisos de administración: `requireTipo('admin')` devuelve 403 antes de consultar permisos. Un usuario desactivado recibe 401 aunque el JWT siga vigente.

Caja: un solo turno `ABIERTO` por caja y por cajero (409; lo garantizan los índices únicos de la BD). Solo el cajero dueño del turno registra movimientos y solo en turnos abiertos; un `EGRESO` mayor al efectivo esperado devuelve 409. Los montos viajan como número o texto con máximo 2 decimales y se devuelven como string.

Inventario: cada escritura se ejecuta con `withTransaction` y `app.user_id`; cambios de existencias y mermas llaman las funciones SQL existentes para serializar el stock y dejar kardex. Las consultas operativas filtran sucursales asignadas; el costo promedio se expone solo a quien tiene `INV_VER_COSTOS`. El esquema inicial ya incluye 12 productos elaborados, 3 de reventa y sus recetas.

