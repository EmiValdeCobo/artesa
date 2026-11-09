Formato: `fecha | integrante | herramienta/modelo | para qué se usó | quién verificó y entiende el resultado`
2026-11-02 | (equipo) | Claude | Diseño de la BD, script PostgreSQL y esqueleto del proyecto | (completar: quién lo revisó)
2026-11-02 | (equipo) | Antigravity (Gemini) | Aseguramiento y parametrización de variables sensibles en Docker y .env | (completar: quién lo revisó)
2026-11-02 | (equipo) | Antigravity (Gemini) | Configuración de arranque concurrente con npm run dev desde la raíz y sincronización de .env | (completar: quién lo revisó)
2026-11-02 | (equipo) | Antigravity (Gemini) | Configuración de workspaces con pnpm, Dockerfile frontend y documentación detallada de despliegue en README | (completar: quién lo revisó)
2026-11-02 | (equipo) | Antigravity (Gemini) | Actualización global de nombres de paquetes y marcas de origenes-sv a artesa | (completar: quién lo revisó)
2026-11-02 | (equipo) | Antigravity (Gemini) | Resolución de dependencias fontsource, configuración Vite para Tailwind v4 y corrección de import en ProtectedRoute | (completar: quién lo revisó)
2026-11-02 | (equipo) | Codex | Separación de portales de login y creación de seeder de cuentas demo | (completar: quién lo revisó)
2026-11-02 | (equipo) | Codex | Documentación de los comandos para aplicar la migración y el seeder | (completar: quién lo revisó)
2026-11-02 | (equipo) | Codex | Mejora visual de los formularios de acceso con iconos accesibles | (completar: quién lo revisó)
2026-11-03 | (equipo) | Antigravity (Gemini) | Creación de skill de prompts significativos y repositorio de instrucciones de alto impacto | (completar: quién lo revisó)
2026-11-03 | EmiValdeCobo | Codex | Implementación de la interfaz frontend de gestión de roles y permisos, respetando el catálogo RBAC existente | EmiValdeCobo
2026-11-03 | EmiValdeCobo | Codex | Implementación del CRUD de usuarios con asignación de roles y sucursales, validación y desactivación lógica | EmiValdeCobo
2026-11-03 | EmiValdeCobo | Codex | Diagnóstico y corrección de validación Sequelize al crear usuarios por activo nulo | EmiValdeCobo
2026-11-03 | (equipo) | Codex | Diagnóstico del rol PostgreSQL y automatización reproducible de migraciones y seeders con pg/psql | (completar: quién lo revisó)
2026-11-03 | (equipo) | Codex | Migración de la capa de acceso a datos a Sequelize, preservando transacciones, RBAC y funciones SQL críticas | (completar: quién lo revisó)
2026-11-03 | (equipo) | Codex | Remediación de secretos detectados por GitGuardian en configuración Docker y archivos de ejemplo | (completar: quién lo revisó)
2026-11-03 | (equipo) | Codex | Creación y configuración del rol global restringido web_user para la conexión del backend a PostgreSQL | (completar: quién lo revisó)
2026-11-03 | (equipo) | Codex | Rediseño del sidebar frontend con navegación por permisos, estados responsive y accesibilidad | (completar: quién lo revisó)
2026-11-03 | (equipo) | Codex | Aplicación de hallazgos técnicos de seguridad, infraestructura, pruebas y documentación de endpoints | (completar: quién lo revisó)
2026-11-04 | Andres | Claude | Implementación del backend de turnos (T05) y movimientos de caja (T06) con pruebas contra PostgreSQL | Andres
2026-11-06 | (equipo) | Codex | Implementación del CRUD backend de roles, permisos y asignaciones RBAC con validación, transacciones y pruebas contractuales | (completar: quién lo revisó)
2026-11-05 | EmiValdeCobo | Codex | Ajuste responsive de LoginPage para eliminar scroll vertical y adaptar el formulario en móvil | EmiValdeCobo
2026-11-05 | EmiValdeCobo | Codex | Ajuste visual de la ilustración del login para evitar solapamiento con el mensaje del panel | EmiValdeCobo
2026-11-06 | EmiValdeCobo | Codex | Validación de seguridad para impedir que un usuario se desactive o elimine a sí mismo, con aviso en la interfaz y protección en el servicio | EmiValdeCobo
2026-11-06 | (equipo) | Codex | Creación de un sistema de alertas React accesible con confirmación, entrada, tipos semánticos, modo oscuro y migración de confirmaciones de usuarios | (completar: quién lo revisó)
2026-11-07 | Codex | Implementación del backend de Inventario conforme al esquema y patrones existentes; el equipo debe revisar permisos, validaciones y funciones SQL antes de defender la integración | backend/src/modules/inventario, backend/src/models/inventario.js
2026-11-07 | Codex | Diagnóstico y corrección del error ESM por exportaciones faltantes en el índice de modelos del backend | backend/src/models/index.js
2026-11-07 | Codex | Diagnóstico y corrección del export faltante validateQuery usado por las rutas del dashboard | backend/src/middlewares/validate.js
2026-11-07 | Codex | Diagnóstico y corrección del intento de reasignar req.query, propiedad de solo lectura en Express | backend/src/middlewares/validate.js
2026-11-07 | Codex | Diagnóstico y corrección de controladores del dashboard que leían una propiedad inexistente req.consulta | backend/src/modules/dashboard/dashboard.controller.js
2026-11-07 | Codex | Generación de datos demo para validar visualmente el dashboard con ventas, ranking, stock bajo y pedido en preparación | database/seeders/002_dashboard_demo.sql
2026-11-07 | Codex | Implementación asistida del panel de administración de roles y permisos, incluyendo CRUD, asignación RBAC y validaciones de interfaz | frontend/src/modules/seguridad, frontend/src/components
2026-11-07 | Codex | Diagnóstico y corrección de columna inexistente en el seeder de ventas demo | database/seeders/002_dashboard_demo.sql
2026-11-07 | Codex | Reorganización segura de componentes reutilizables por función y actualización de rutas de importación | frontend/src/components, frontend/src/pages, frontend/src/layout, frontend/src/modules
2026-11-08 | Rodri | Codex | Auditoría de T11 y corrección del kardex: visibilidad de costo_unitario por INV_VER_COSTOS y aislamiento por sucursal antes del límite; la implementación original de stock y mermas es preexistente y no se atribuye a Rodri. Se añadieron pruebas contractuales; Rodri revisó el alcance, rutas y permisos; revisar el diff final antes de defender | backend/src/modules/inventario/inventario.repository.js, backend/src/modules/inventario/inventario.service.js, test/inventario-contracts.test.js, docs/endpoints.md, docs/ai/CHANGELOG_AGENTE.md, docs/USO_IA.md | Rodri 
2026-11-08 | Andres | Claude | Backend de cierre y cuadre de turno (T22), reportes (T23) y cola de preparación (T24) con pruebas contra PostgreSQL | Andres
2026-11-08 | Rodri | Codex | Implementación frontend de T10: pantalla de stock, alertas y registro de mermas sobre endpoints existentes; Rodri revisó y autorizó el alcance y permisos. Validaciones: lint sin advertencias, 16 pruebas aprobadas y build recursivo exitoso; revisión visual pendiente | frontend/src/modules/inventario/InventarioPage.jsx, frontend/src/App.jsx | Rodri 
