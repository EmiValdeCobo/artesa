# CONTEXT — estado vivo del proyecto (máx. 60 líneas; actualizar al cerrar tareas)
Actualizado: 2026-11-09

## Meta y fechas
Defensas desde el 2026-11-18. Entregables: sistema funcional en GitHub, IEEE, manual de usuario, doc técnica, flujo de trabajo.

## Decisiones tomadas
- Stack: Express + Sequelize (conductor `pg`) + PostgreSQL 16; React + Vite + Tailwind (sin Next.js); JS puro.
- Lógica de negocio crítica en funciones PL/pgSQL (ver DB_MAP.md). Backend las invoca.
- Precios incluyen IVA (13%); se desglosa en la factura. (Confirmar con docente si el CCF suma IVA aparte.)
- Facturación electrónica DTE simulada (número de control, código de generación, sello simulado).
- RBAC dinámico: roles y permisos en BD; middleware `requirePermiso`.
- CRUD: modelos Sequelize; funciones SQL y vistas con consultas parametrizadas. Migraciones/seeders: `psql` mediante scripts del proyecto.
- Conexión BD: el backend usa el rol global restringido `web_user`; `POSTGRES_USER` queda reservado para administración y migraciones.
- Sesiones: JWT en cookie `httpOnly`, `SameSite` configurable y `secure` configurable; el backend revalida `activo=true` en cada request.
- Migraciones/seeders: `scripts/db.js` registra nombre, checksum SHA-256, fecha y tipo en `public.schema_migrations`.
- Bitácora analítica: captura IP/User-Agent en `AsyncLocalStorage` y los propaga a variables PostgreSQL mediante `withTransaction`.
- QA / Pruebas: suite automatizada en Node.js nativo (`node:test`, 119 pruebas activas) cubriendo contratos de API, FSM, anti-float y lógica frontend.

## Estado por módulo
| Módulo | BD | Backend | Frontend |
|---|---|---|---|
| auth / seguridad | listo | login, CRUD RBAC, usuarios y API /bitacora con métricas | Bitácora con filtros, analítica y gestión de usuarios/roles |
| inventario | listo | CRUD insumos/productos, stock, mermas, alertas, kárdex | Inventario, alertas, mermas y Kárdex de movimientos |
| pos | listo | cola de preparación (/api/preparacion) y órdenes (T02) | catálogo y carrito local; cobro/facturación pendiente |
| caja | listo | turnos, movimientos, cierre y cuadre (T05/T06/T22) | pendiente |
| compras | listo | pendiente | pantallas pendientes (usan PendienteApiPage) |
| rrhh | listo | pendiente | pantallas pendientes (usan PendienteApiPage) |
| reportes | vistas listas | ventas diarias, top productos, alertas y margen (T23) | tablas filtrables, exportación CSV (UTF-8 BOM) y PDF |
| empresa | listo | CRUD sucursales y edición parámetros | sucursales y parámetros |

Pantallas pendientes por falta de endpoints backend: empleados/puestos, proveedores, CxP, compras tipo gasto y planillas.

## Pendientes críticos
- Verificar tablas de renta/ISSS/AFP vigentes con Hacienda (están en `rrhh.tramos_renta` y `empresa.parametros`).
- Asignar responsables por módulo (ver README).
- Cambiar contraseñas semilla (`Cambiar123*`) antes de desplegar.
