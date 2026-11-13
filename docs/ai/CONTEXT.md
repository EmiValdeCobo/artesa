# CONTEXT — estado vivo del proyecto (máx. 60 líneas; actualizar al cerrar tareas)
Actualizado: 2026-11-12

## Meta y fechas
Defensas desde el 2026-11-18. Entregables: sistema funcional en GitHub, IEEE (listo en docs/Documentacion_IEEE con compilador y visor), manual de usuario, doc técnica, flujo de trabajo.

## Decisiones tomadas
- Stack: Express + Sequelize (conductor `pg`) + PostgreSQL 16; React + Vite + Tailwind (sin Next.js); JS puro.
- Lógica de negocio crítica en funciones PL/pgSQL (ver DB_MAP.md). Backend las invoca.
- Precios incluyen IVA (13%); se desglosa en la factura. (Confirmar con docente si el CCF suma IVA aparte.)
- Facturación electrónica DTE simulada (número de control, código de generación, sello simulado).
- RBAC dinámico: roles y permisos en BD; middleware `requirePermiso`.
- El Kárdex requiere `INV_VER_KARDEX`; su `costo_unitario` solo se incluye con `INV_VER_COSTOS` además del permiso de Kárdex. El seeder `003_inventario_kardex.sql` está pendiente de aplicación en la BD local por un error previo en `001_portales_demo.sql`.
- CRUD: modelos Sequelize; funciones SQL y vistas con consultas parametrizadas. Migraciones/seeders: `psql` mediante scripts del proyecto.
- Conexión BD: el backend usa el rol global restringido `web_user`; `POSTGRES_USER` queda reservado para administración y migraciones.
- Sesiones: JWT en cookie `httpOnly`, `SameSite` configurable y `secure` configurable; el backend revalida `activo=true` en cada request.
- Migraciones/seeders: `scripts/db.js` registra nombre, checksum SHA-256, fecha y tipo en `public.schema_migrations`.
- Bitácora analítica: captura IP/User-Agent en `AsyncLocalStorage` y los propaga a variables PostgreSQL mediante `withTransaction`.
- QA / Pruebas: suite automatizada en Node.js nativo (`node:test`, 132 pruebas activas) cubriendo contratos de API, FSM, anti-float y lógica frontend.
- UI / Dashboard: diseño unificado con tarjetas redondeadas, paleta de marca (Terracota, Ocre, Espresso) y tipografía Montserrat del sistema (sin fuentes externas).

## Estado por módulo
| Módulo | BD | Backend | Frontend |
|---|---|---|---|
| auth / seguridad | listo | login, CRUD RBAC, usuarios y API /bitacora con métricas | Bitácora con filtros, analítica y gestión de usuarios/roles |
| inventario | listo | CRUD unidades-medida/insumos/productos, stock, mermas, alertas y Kárdex con permiso propio | Existencias, kárdex, catálogo de insumos (tabs + semáforo), catálogo de productos (tabla/grid) y editor de recetas BOM |
| pos | listo | cola de preparación, órdenes (T02), ventas (T17), anulación (`fn_anular_venta`) y CRUD clientes CCF (T18-back) | catálogo y carrito local; pantallas de clientes/anulación (T18-front), cobro (T19) y ticket (T46) pendientes |
| caja | listo | turnos, movimientos, cierre y cuadre (T05/T06/T22) | pendiente |
| compras | listo | T30 CRUD proveedores; T31 registro de facturas COSTO por función SQL y transacción; T32/T33 pendientes | proveedores, compras, CxP y gastos siguen con PendienteApiPage |
| rrhh | listo | CRUD de puestos y empleados, validaciones, permisos y datos de prueba | pendiente |
| reportes | vistas listas + consultas de método de pago, cuadre y CxP | ventas diarias, top productos, métodos de pago, alertas, margen, cuadre y CxP; alcance por `id_sucursal` | panel con tendencias, comparativos, tablas paginadas y exportación CSV/PDF |
| empresa | listo | CRUD sucursales y edición parámetros | sucursales y parámetros |

Pantallas de gestión pendientes por falta de endpoints backend: empleados/puestos, pagos/CxP y compras tipo gasto (T32/T33), además de planillas. Proveedores y registro de facturas COSTO tienen API; falta frontend funcional. El reporte de CxP de solo lectura ya está disponible dentro de Reportes.

## Pendientes críticos
- Verificar tablas de renta/ISSS/AFP vigentes con Hacienda (están en `rrhh.tramos_renta` y `empresa.parametros`).
- Asignar responsables por módulo (ver README).
- Cambiar contraseñas semilla (`Cambiar123*`) antes de desplegar.
