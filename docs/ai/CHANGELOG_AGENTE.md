# Registro de cambios (una línea por cambio; añadir AL FINAL; leer solo `tail -n 15`)
Formato: `AAAA-MM-DD | quién (persona/agente) | área | qué cambió | archivos`
2026-11-02 | claude | base | Estructura inicial, reglas de agentes, esqueleto backend (auth) y frontend (login/rutas) | AGENTS.md, backend/, frontend/, docs/ai/
2026-11-02 | claude | frontend/infra | Frontend (login, rutas protegidas por permiso, layout), docker-compose, README; backend auth probado contra BD real | frontend/, docker-compose.yml, README.md
2026-11-02 | antigravity | infra/seguridad | Parametrización segura de docker-compose.yml con variables en .env y refuerzo de .gitignore | docker-compose.yml, .env.example, .gitignore, README.md
2026-11-02 | antigravity | dx/fullstack | Configuración de arranque dual con `npm run dev` en raíz (scripts/dev.js) y sincronización de .env | package.json, scripts/dev.js, frontend/, .env.example, README.md
2026-11-02 | antigravity | dx/infra | Migración de gestión a pnpm workspace, Dockerfile/nginx para frontend y documentación exhaustiva de Opción 2 en README | pnpm-workspace.yaml, package.json, frontend/Dockerfile, README.md
2026-11-02 | antigravity | config/branding | Renombrado de origenes-sv por artesa en paquetes, scripts y documentación | package.json, backend/package.json, frontend/package.json, README.md, AGENTS.md
2026-11-02 | antigravity | frontend/fix | Instalación de tipografía Montserrat, configuración Tailwind v4 (@tailwindcss/vite) y corrección de ruta AuthContext | frontend/package.json, vite.config.js, src/index.css, src/components/ProtectedRoute.jsx
2026-11-02 | codex | auth/portales | Separación de login administrativo y portal de clientes con sesión JWT independiente y seeder demo | backend/src/modules/auth, backend/src/middlewares/auth.js, frontend/src, database/migrations/001_portal_clientes.sql, database/seeders/001_portales_demo.sql
2026-11-02 | codex | docs/despliegue | Documentación de aplicación de migración y seeder de portales en README | README.md
2026-11-02 | codex | frontend/auth | Añadidos iconos visuales a los campos de usuario y contraseña de ambos portales | frontend/src/pages/LoginPage.jsx, frontend/src/pages/ClienteLoginPage.jsx
2026-11-03 | antigravity | ai/skills | Creación de skill de prompts significativos y repositorio de instrucciones críticas | docs/ai/skills/prompts-significativos.md, .agents/skills/prompts-significativos/SKILL.md, AGENTS.md, docs/USO_IA.md
2026-11-03 | EmiValdeCobo | frontend/seguridad | Implementada pantalla responsive de roles y permisos con selección por módulo, búsqueda y ruta protegida | frontend/src/modules/seguridad/RolesPermisosPage.jsx, frontend/src/App.jsx, docs/ai/CONTEXT.md
2026-11-03 | EmiValdeCobo | seguridad/usuarios | Implementado CRUD de usuarios con asignación de rol, sucursales, bcrypt y desactivación lógica | backend/src/modules/seguridad, frontend/src/modules/seguridad/UsuariosPage.jsx, frontend/src/App.jsx
2026-11-03 | codex | docs/infra | Corregidos comandos por POSTGRES_USER y automatizados migraciones/seeders con scripts psql | README.md, package.json, scripts/db-migrate.ps1, scripts/db-seed.ps1, docs/ai/CONTEXT.md, docs/USO_IA.md
2026-11-03 | codex | backend/orm | Migrada la capa de acceso activa a Sequelize con modelos y transacciones compatibles con bitácora; corregida conexión interna Docker | backend/src/config, backend/src/models, backend/src/modules/auth, backend/src/modules/seguridad, docker-compose.yml, AGENTS.md, README.md
2026-11-03 | codex | seguridad/secretos | Eliminados valores de respaldo y credenciales expuestas; Docker exige secretos desde .env | docker-compose.yml, .env.example, backend/.env.example, README.md, docs/ai/
2026-11-03 | codex | infra/seguridad | Creado el rol global restringido web_user y configurado Sequelize/Docker para usarlo | database/init/02_create_web_user.sql, database/migrations/002_usuario_web.sql, docker-compose.yml, .env.example, backend/.env.example
2026-11-03 | codex | frontend/layout | Rediseñado el sidebar con árbol RBAC, submenús, colapso persistente, flyouts y drawer responsive | frontend/src/config/menu.js, frontend/src/layout/Sidebar.jsx, frontend/src/layout/AppLayout.jsx, frontend/src/hooks/useSidebar.js
2026-11-03 | EmiValdeCobo | seguridad/usuarios | Corregido el alta de usuarios estableciendo activo=true por defecto en el modelo Sequelize | backend/src/models/index.js

2026-11-03 | fix(frontend) | Instal� @fontsource-variable/fraunces@5.3.0 en frontend/ � faltaba el paquete y Vite no pod�a resolver wght.css/wght-italic.css en index.css
2026-11-03 | codex | seguridad/infra | Cookies httpOnly, revalidación activa, RBAC admin, rate limit, runner Node idempotente, tooling y documentación entregable | backend/src, frontend/src, scripts/db.js, docs, Dockerfiles
