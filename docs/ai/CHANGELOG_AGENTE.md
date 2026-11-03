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
