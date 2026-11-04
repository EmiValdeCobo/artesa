# artesa â€” ERP + POS
Proyecto de cÃ¡tedra ProgramaciÃ³n Web (ciclo 02-2026). Express + PostgreSQL + React (Vite, Tailwind).

## Modos de arranque

### OpciÃ³n 1: Desarrollo local rÃ¡pido con `pnpm` (Recomendado para programar)
Permite recarga en caliente (Hot Reload) tanto en backend como frontend, ejecutando Ãºnicamente la base de datos dentro de Docker:

```bash
# 0. Asegurarse de tener pnpm instalado (si aÃºn no lo tienes):
npm install -g pnpm

# 1. Configurar variables de entorno
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# 2. Levantar la base de datos PostgreSQL con Docker
docker compose up -d db

# 3. Instalar dependencias en todo el workspace (raÃ­z, backend y frontend)
pnpm install

# 4. Iniciar backend y frontend simultÃ¡neamente en modo desarrollo
pnpm dev
```
- **Frontend (Vite)**: http://localhost:5173
- **Backend API (Express)**: http://localhost:3000/api/health
- Comandos individuales opcionales:
  - Backend solo: `pnpm --filter artesa-backend dev`
  - Frontend solo: `pnpm --filter artesa-frontend dev`

---

### OpciÃ³n 2: Entorno completo en contenedores con Docker Compose
DiseÃ±ado para probar la aplicaciÃ³n tal y como correrÃ¡ en producciÃ³n o para evaluar el sistema sin necesidad de instalar Node ni pnpm en la mÃ¡quina anfitriona.

#### Â¿CÃ³mo funciona esta arquitectura?
Docker Compose levanta y conecta 3 servicios aislados en una misma red virtual interna:
1. **`db` (PostgreSQL 16 Alpine)**:
   - Inicializa automÃ¡ticamente el esquema de base de datos (`database/init/01_schema.sql`) la primera vez.
   - Mantiene la persistencia de datos en el volumen Docker `pgdata`.
   - Incluye *healthcheck* (`pg_isready`) para que el backend espere a que la BD estÃ© 100% lista.
2. **`api` (Backend Express)**:
   - Se construye con `backend/Dockerfile` en una imagen Node 22.
   - Se conecta internamente a la base de datos usando `DB_HOST=db` y el puerto `5432`; no reutiliza `localhost` del entorno anfitriÃ³n.
   - Expone el puerto `3000`.
3. **`web` (Frontend React + Nginx)**:
   - Se compila en una fase multi-stage y sirve los archivos estÃ¡ticos optimizados mediante un servidor web Nginx ligero.
   - Nginx actÃºa ademÃ¡s como **reverse proxy**: redirige las peticiones que van hacia `/api/*` directamente al contenedor `api:3000`.
   - Expone la aplicaciÃ³n en el puerto `8080`.

#### Pasos para ejecutar la OpciÃ³n 2:
```bash
# 1. Crear el archivo de entorno en la raÃ­z y reemplazar TODOS los valores CAMBIAR_*.
#    .env contiene secretos: nunca lo subas a Git.
cp .env.example .env

# 2. Construir las imÃ¡genes y levantar todos los contenedores en segundo plano
docker compose up -d --build

# 3. Ver el estado y logs de los servicios
docker compose ps
docker compose logs -f

# 4. Detener todos los servicios cuando termines
docker compose down
```
- **AplicaciÃ³n web lista**: http://localhost:8080
- **API directa**: http://localhost:3000/api/health
Usuarios demo (clave `Cambiar123*`): admin, gerente1, cajero1, barista1, bodega1. Datos de ejemplo: `database/demo/02_demo.sql`.

## Base de datos — migraciones y esquema

### Clon fresco (modo recomendado)

Al levantar el contenedor por primera vez con volumen vacío, Docker ejecuta automáticamente **todos** los archivos de `database/init/` en orden alfabético:

| Archivo | Qué hace |
|---------|----------|
| `01_schema.sql` | Esquema completo (tablas, funciones, triggers, vistas) |
| `02_create_web_user.sql` | Rol restringido `web_user` para la aplicación |
| `03_soft_delete.sql` | Columna `deleted_at` en tablas de catálogos (eliminación visual) |
| `04_timestamps.sql` | Columna `modificado_en` + triggers `BEFORE UPDATE` automáticos |

```powershell
# Basta con esto en un clon limpio — todo queda listo:
docker compose up -d db
```

> **Importante:** Docker solo ejecuta `database/init/` cuando el volumen `pgdata` está vacío (primera vez). Si ya tienes datos, usa el runner manual (ver abajo).

---

### Base existente — aplicar migraciones manualmente

Si ya tienes el contenedor corriendo con datos previos (volumen `pgdata` existente), las migraciones **NO** se aplican solas. Tienes dos opciones:

#### Opción A — `psql` directo (más simple)

```powershell
# Levanta la BD si no está corriendo
docker compose up -d db

# Aplica cada migración pendiente en orden
docker exec -i artesa-db-1 psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB < database/migrations/003_soft_delete.sql
docker exec -i artesa-db-1 psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB < database/migrations/004_timestamps.sql
```

#### Opción B — Runner `scripts/db.js` (registra en `schema_migrations`)

El runner se conecta con `DATABASE_URL` o con `POSTGRES_*` del entorno, registra cada archivo en `public.schema_migrations` con SHA-256 y **no reaplica archivos ya registrados**. Si un archivo aplicado cambia, falla para evitar deriva del esquema.

```powershell
docker compose up -d db
pnpm db:migrate   # aplica database/migrations/ pendientes
pnpm db:seed      # aplica database/seeders/ pendientes
```

---

### ¿Cuándo usar cada opción?

| Situación | Solución |
|-----------|----------|
| Cloné el repo y levanto por primera vez | `docker compose up -d` — automático ✅ |
| Ya tenía datos, llegó una migración nueva | Opción A (`psql`) o Opción B (`pnpm db:migrate`) |
| Quiero un entorno limpio desde cero | `docker compose down -v && docker compose up -d` |

`POSTGRES_USER` es el rol administrador usado por Docker. La aplicación usa el rol restringido `WEB_DB_USER` (por defecto `web_user`) definido en `.env`.

Credenciales de prueba:

- Área administrativa: `admin` / `Cambiar123*` en `/admin/login`.
- Área cliente: `cliente.demo` / `Cliente123*` en `/cliente/login`.

## Trabajo con agentes de IA (opencode, Cursor, Antigravity)
Todos leen `AGENTS.md` (GEMINI.md y `.cursor/rules` solo apuntan a él). Contexto: `docs/ai/`. Cada cambio se registra en `docs/ai/CHANGELOG_AGENTE.md`; el uso de IA se declara en `docs/USO_IA.md`.

## Flujo de trabajo colaborativo (Git Flow)

El proyecto sigue una adaptación práctica de **Git Flow** para el trabajo en equipo:

- **`main`**: Rama protegida y estable. Solo contiene versiones listas para entrega/defensa. No se commitea directamente en `main`.
- **`develop`**: Rama base de integración diaria. Todo el trabajo completado y probado se fusiona aquí.
- **`feature/<modulo>-<descripcion>`**: Ramas de trabajo individuales para cada funcionalidad (ej. `feature/pos-cobro`, `feature/inventario-kardex`).
  - **Crear rama de trabajo**:
    ```bash
    git checkout develop
    git pull origin develop
    git checkout -b feature/<modulo>-<descripcion>
    ```
  - **Convención de commits**:
    Usa Conventional Commits en minúsculas y en español:
    `feat(<modulo>): ...`, `fix(<modulo>): ...`, `docs: ...`, `refactor: ...`, `chore: ...`.
  - **Integrar cambios**:
    Al terminar tu feature, sube tu rama y abre un **Pull Request (PR)** hacia `develop`:
    ```bash
    git push -u origin feature/<modulo>-<descripcion>
    ```

---

## Equipo (completar)
| Módulo | Responsables | Rama |
|---|---|---|
| Seguridad y roles | | feature/seguridad-* |
| Inventario y recetas | | feature/inventario-* |
| POS y facturación | | feature/pos-* |
| Caja y turnos | | feature/caja-* |
| Compras y proveedores | | feature/compras-* |
| RR. HH. y planilla | | feature/rrhh-* |
| Dashboard y reportes | | feature/reportes-* |
| Documentación, IEEE, despliegue | | feature/docs-* |
