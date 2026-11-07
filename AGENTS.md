# artesa — Reglas para agentes de IA (fuente única)
ERP + POS para restaurante/cafetería (El Salvador). Proyecto de cátedra Programación Web, ciclo 02-2026. Equipo de 8.
Este archivo lo leen opencode y Cursor; GEMINI.md (Antigravity) y .cursor/rules solo apuntan aquí.

## Flujo obligatorio (ahorra tokens)
1. Al empezar: lee `docs/ai/CONTEXT.md` y `tail -n 15 docs/ai/CHANGELOG_AGENTE.md`. NADA más hasta que lo necesites.
2. Base de datos: consulta `docs/ai/DB_MAP.md`. NO leas `database/init/01_schema.sql` completo; usa `grep -n` sobre él.
3. Busca con `grep`/`rg` antes de abrir archivos. Abre solo el fragmento necesario. No releas lo que ya leíste.
4. Antes de programar una tarea típica, lee SOLO la skill que aplique (`docs/ai/skills/`).
5. Al terminar CADA cambio: añade 1 línea a `docs/ai/CHANGELOG_AGENTE.md` (skill `00-registrar-cambio`). Si cambió el estado o una decisión, actualiza `docs/ai/CONTEXT.md` (máx. 60 líneas).
6. Cierra con un resumen de 3-5 líneas en el chat explicando QUÉ hiciste y POR QUÉ: cada integrante debe poder defenderlo.

## Stack (decidido, no cambiarlo sin consultar)
Node.js (ESM, JavaScript puro) + Express · PostgreSQL 16 + Sequelize (conductor `pg`) · React + Vite + React Router + Tailwind (sin Next.js) · Zod · JWT + bcryptjs · Docker Compose.

## Estructura
```
backend/src/{config,middlewares,utils,modules/<modulo>/{routes,controller,service,repository}}.js
frontend/src/{api,context,components,layout,config,pages,modules/<modulo>}
database/init/01_schema.sql   (se ejecuta solo al crear el contenedor)   database/migrations/NNN_*.sql
docs/ai/ (contexto para agentes)   docs/ (documentación entregable)
```
Módulos: auth, seguridad, empresa, inventario, pos, caja, compras, rrhh, reportes (reflejan los esquemas de la BD).

## Reglas de oro
- La lógica crítica YA vive en funciones SQL: `pos.fn_registrar_venta`, `pos.fn_anular_venta`, `pos.fn_cerrar_turno`, `compras.fn_registrar_compra`, `inventario.fn_mover_stock`, `inventario.fn_registrar_merma`, `rrhh.fn_calcular_planilla`. Se LLAMAN, no se reimplementan en JS.
- Capas: routes → controller (HTTP) → service (negocio) → repository (SQL). El controller nunca escribe SQL.
- Toda ruta protegida lleva `authenticate` y `requirePermiso('CODIGO')`. Los códigos están en `seguridad.permisos`.
- Escrituras: usa `withTransaction(fn, userId)` de Sequelize (setea `app.user_id` para la bitácora).
- Usa modelos Sequelize para CRUD. Para vistas y funciones SQL críticas, usa `sequelize.query` con `bind` (`$1`), nunca concatenado. Dinero: nunca float en cálculos; PostgreSQL `NUMERIC` se mantiene como string.
- Validar entradas con Zod. Errores con `AppError`; en `async` usa `asyncHandler`; en el frontend `try/catch` en cada llamada a la API.
- API REST: sustantivos en plural, verbos HTTP correctos, códigos 200/201/204/400/401/403/404/409.
- Idioma: UI y comentarios en español; nombres de dominio en español igual que la BD (ventas, insumos, turnos).
- BD: no edites `01_schema.sql`; crea `database/migrations/NNN_descripcion.sql`.
- Secretos solo en `.env` (nunca en git). Ramas `feature/<modulo>-<desc>`, commits estrictos `<emoji> <tipo>(<alcance>): <descripción>` (ver skill `convencion-commits`).
- Uso de IA: registra cada uso significativo en `docs/USO_IA.md` (el enunciado exige declararlo; sin comprensión = penalización).

## Skills (leer solo la que aplique)
`00-registrar-cambio` · `convencion-commits` · `nuevo-endpoint-rest` · `nueva-pantalla-react` · `cambio-base-datos` · `permisos-rbac` · `usar-funciones-sql` · `prompts-significativos`
Ubicación: `docs/ai/skills/<nombre>.md`

## Comandos
`docker compose up -d db` · `pnpm --filter artesa-backend dev` (puerto 3000) · `pnpm --filter artesa-frontend dev` (puerto 5173, proxy /api).
