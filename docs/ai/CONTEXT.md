# CONTEXT — estado vivo del proyecto (máx. 60 líneas; actualizar al cerrar tareas)
Actualizado: 2026-11-13

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
- QA / Pruebas: suite automatizada en Node.js nativo (`node:test`, 249 pruebas activas) cubriendo contratos de API, FSM, anti-float, UI/UX y lógica frontend.
- UI / Dashboard: diseño unificado con tarjetas redondeadas, paleta de marca (Terracota, Ocre, Espresso) y tipografía Montserrat del sistema (sin fuentes externas).
- UX inventario y recetas: Catálogo con badge de ingredientes alineado en sub-línea, costo en 1 línea ($0.00), modal rápido de preview de receta con estética editorial clara (Alabastro/Espresso/Terracota), redirección automática al crear producto elaborado; Editor de Recetas con flujo dual (Ficha Técnica de solo lectura con % de proporción vs Constructor interactivo), skeletons cálidos (sin spinners circulares), disponibilidad operativa con selector de sucursal/cuello de botella/alerta de stock 0 y ajuste rápido de precio con precio sugerido 40% (IVA 13% incluido).


## Estado por módulo
| Módulo | BD | Backend | Frontend |
|---|---|---|---|
| auth / seguridad | listo | login, CRUD RBAC, usuarios y API /bitacora con métricas | Bitácora con filtros, analítica y gestión de usuarios/roles |
| inventario | listo | CRUD unidades/insumos/productos, stock, mermas, alertas y Kárdex; separación de activo (PATCH :id/estado) vs soft delete (DELETE :id) | Existencias/kárdex por sucursal; catálogos con control de estado y eliminación diferenciados, filtros Todos/Activos/Inactivos y alertas de recetas |
| pos | listo | cola de preparación, órdenes (T02), ventas (T17), anulación (`fn_anular_venta`) y CRUD clientes CCF (T18-back) | catálogo y carrito local; pantallas de clientes/anulación (T18-front), cobro (T19) y ticket (T46) pendientes |
| caja | listo | turnos, movimientos, cierre y cuadre (T05/T06/T22) con tolerancia configurable | pantalla de caja integrada desde develop |
| compras | listo | T30 proveedores; T31 facturas COSTO; T32 pagos/CxP; T33 registro backend GASTO | Proveedores, registro COSTO/GASTO, CxP y pagos integrados a las APIs |
| rrhh | listo | CRUD de puestos/empleados y planillas mensuales, cálculo SQL, PDFs y permisos; pendiente extensión fiscal anual | pantallas de puestos/empleados pendientes |
| reportes | vistas listas + consultas de método de pago, cuadre y CxP | ventas diarias, top productos, métodos de pago, alertas, margen, cuadre y CxP; alcance por `id_sucursal` | panel con tendencias, comparativos, tablas paginadas y exportación CSV/PDF |
| empresa | listo | CRUD sucursales y edición parámetros | sucursales y parámetros |

Pantallas de gestión pendientes: puestos/empleados y planillas en frontend. Proveedores, facturas COSTO/GASTO, pagos y CxP operativa integrados en frontend. El reporte CxP de solo lectura de Reportes se conserva y comparte consulta con la ruta operativa.

## Pendientes críticos
- Verificar periódicamente tramos/versiones legales de renta, ISSS, AFP e INSAFORP con Hacienda/ISSS/SSF.
- Planillas: migración 007 debe aplicarse; el DE 10 requiere deducción adicional del tramo II y recálculos en junio/diciembre aún no modelados.
- Asignar responsables por módulo (ver README).
- Cambiar contraseñas semilla (`Cambiar123*`) antes de desplegar.
