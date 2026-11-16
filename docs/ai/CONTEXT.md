# CONTEXT — estado vivo del proyecto (máx. 60 líneas; actualizar al cerrar tareas)
Actualizado: 2026-11-15

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
- Sesiones: JWT en cookie `httpOnly`, `SameSite`/`secure` configurables (`secure=true` por defecto en producción), `trust proxy` en Express, login con hash dummy anti-timing attack y logout con revocación `jti` (`seguridad.tokens_revocados`).
- Migraciones/seeders: `scripts/db.js` registra nombre, checksum SHA-256, fecha y tipo en `public.schema_migrations`. Paridad 1:1 estricta entre `database/init` (Docker bootstrap) y `database/migrations` (db:migrate).
- Producción y Docker: `morgan` estructurado (`combined` en prod, silenciado en test), cookies seguras por defecto y puertos aislados en Docker Compose (`db` en `127.0.0.1` y `api` en `expose` interno sin bypass de Nginx).
- Bitácora analítica: captura IP/User-Agent en `AsyncLocalStorage` y los propaga a variables PostgreSQL mediante `withTransaction`.
- QA / Pruebas: suite automatizada en Node.js nativo (`node:test` + `supertest`, 319 pruebas activas, 0 fallos) y linter con 0 advertencias (hooks estabilizados sin closures obsoletos) cubriendo contratos de API, FSM, anti-float, UI/UX, lógica frontend, cola de preparación, suite bloqueante P0, validaciones de catálogo/auditoría extendida P1, diffing/accesibilidad/integración HTTP P2, condición de carrera, timing attacks, revocación JWT, hardening de producción y code-splitting.
- UI / Frontend: diseño unificado con selector de sucursal global, paneles reactivos (ventas, top productos, alertas navegables con accesibilidad y hover hacia sus respectivos módulos), paleta de marca (Terracota, Ocre, Espresso), tipografía Montserrat y code-splitting por ruta con `React.lazy` y `Suspense` (bundle inicial reducido de 623 KB a 242 KB, -61%).
- UX inventario y recetas: Catálogo con badge de ingredientes alineado en sub-línea, costo en 1 línea ($0.00), modal rápido de preview de receta con estética editorial clara (Alabastro/Espresso/Terracota), redirección automática al crear producto elaborado; Editor de Recetas con flujo dual (Ficha Técnica de solo lectura con % de proporción vs Constructor interactivo), skeletons cálidos (sin spinners circulares), disponibilidad operativa con selector de sucursal/cuello de botella/alerta de stock 0 y ajuste rápido de precio con precio sugerido 40% (IVA 13% incluido).
- UI compartida: iconos por acción en `config/iconos.js` + `BotonIcono` (referencia Usuarios); combobox único `Select`/`CustomSelect` en portal (no se recorta en tablas/diálogos); máscaras en `utils/mascaras.js` (teléfono 2222-3333, código, montos, enteros). Catálogo usa tokens de paleta, sin hex arbitrarios.


## Estado por módulo
| Módulo | BD | Backend | Frontend |
|---|---|---|---|
| auth / seguridad | listo | login, CRUD RBAC, usuarios y API /bitacora con métricas y severidad | Bitácora con filtros (severidad), analítica, roles (ADMIN solo lectura) y captura 409 |
| inventario | listo | CRUD unidades/insumos/productos, stock, mermas, alertas y Kárdex; cantidades físicas recibidas por API (recetas, movimientos, mermas y stock mínimo) validadas como enteros positivos | Existencias/kárdex por sucursal; catálogos con control de estado y eliminación diferenciados, filtros Todos/Activos/Inactivos y alertas de recetas |
| pos | listo | cola de preparación, órdenes (T02), ventas (T17), anulación (`fn_anular_venta`) y clientes CCF (T18) | catálogo, carrito, clientes CCF, historial de ventas y pantalla de cobro con pagos mixtos/vuelto (T19) listos; ticket especializado (T46) |
| caja | listo | turnos, movimientos, cierre y cuadre (T05/T06/T22) con tolerancia configurable | pantalla de caja integrada desde develop |
| compras | listo | T30 proveedores con formatos salvadoreños; T31 valida cantidades enteras, fechas en rango y total positivo, CONTADO registra pago EFECTIVO en la misma transacción; T32 pagos/CxP; T33 registro backend GASTO | Proveedores y facturas COSTO/GASTO; historial CxP por estado, gastos operativos con filtros y total pagado |
| rrhh | listo | CRUD de puestos/empleados y planillas mensuales, cálculo SQL, PDFs y permisos; pendiente extensión fiscal anual | pantallas de puestos/empleados pendientes |
| reportes | vistas listas + consultas de método de pago, cuadre y CxP | ventas diarias, top productos, métodos de pago, alertas, margen, cuadre y CxP; alcance por `id_sucursal` | panel con tendencias, comparativos, tablas paginadas y exportación CSV/PDF |
| empresa | listo | CRUD sucursales (alta asigna a todos los ADMIN activos) y apertura `/sucursales/:id/apertura` (stock mínimo + carga INVENTARIO_INICIAL); edición parámetros | sucursales con diálogo de apertura confirmado y parámetros con máscara por tipo |

Pantallas de gestión pendientes: puestos/empleados y planillas en frontend. Compras permite consultar gastos por factura, estado, sucursal, abonos y saldo; el endpoint de consulta no devuelve las líneas de concepto. El reporte CxP conserva pendientes y período reciente; la ruta operativa permite pendientes/pagadas/todas y exige portal admin más COM_VER_CXP.

## Pendientes críticos
- Verificar periódicamente tramos/versiones legales de renta, ISSS, AFP e INSAFORP con Hacienda/ISSS/SSF.
- Planillas: sincronizados init 08-12; el DE 10 requiere deducción adicional del tramo II y recálculos en junio/diciembre aún no modelados.
- Asignar responsables por módulo (ver README).
- Cambiar contraseñas semilla (`Cambiar123*`) antes de desplegar.
