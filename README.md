# artesa — ERP + POS
Proyecto de cátedra Programación Web (ciclo 02-2026). Express + PostgreSQL + React (Vite, Tailwind).

## Modos de arranque

### Opción 1: Desarrollo local rápido con `pnpm` (Recomendado para programar)
Permite recarga en caliente (Hot Reload) tanto en backend como frontend, ejecutando únicamente la base de datos dentro de Docker:

```bash
# 0. Asegurarse de tener pnpm instalado (si aún no lo tienes):
npm install -g pnpm

# 1. Configurar variables de entorno
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# 2. Levantar la base de datos PostgreSQL con Docker
docker compose up -d db

# 3. Instalar dependencias en todo el workspace (raíz, backend y frontend)
pnpm install

# 4. Iniciar backend y frontend simultáneamente en modo desarrollo
pnpm dev
```
- **Frontend (Vite)**: http://localhost:5173
- **Backend API (Express)**: http://localhost:3000/api/health
- Comandos individuales opcionales:
  - Backend solo: `pnpm --filter artesa-backend dev`
  - Frontend solo: `pnpm --filter artesa-frontend dev`

---

### Opción 2: Entorno completo en contenedores con Docker Compose
Diseñado para probar la aplicación tal y como correrá en producción o para evaluar el sistema sin necesidad de instalar Node ni pnpm en la máquina anfitriona.

#### ¿Cómo funciona esta arquitectura?
Docker Compose levanta y conecta 3 servicios aislados en una misma red virtual interna:
1. **`db` (PostgreSQL 16 Alpine)**:
   - Inicializa automáticamente el esquema de base de datos (`database/init/01_schema.sql`) la primera vez.
   - Mantiene la persistencia de datos en el volumen Docker `pgdata`.
   - Incluye *healthcheck* (`pg_isready`) para que el backend espere a que la BD esté 100% lista.
2. **`api` (Backend Express)**:
   - Se construye con `backend/Dockerfile` en una imagen Node 22.
   - Se conecta internamente a la base de datos usando `DB_HOST=db` y el puerto `5432`; no reutiliza `localhost` del entorno anfitrión.
   - Expone el puerto `3000`.
3. **`web` (Frontend React + Nginx)**:
   - Se compila en una fase multi-stage y sirve los archivos estáticos optimizados mediante un servidor web Nginx ligero.
   - Nginx actúa además como **reverse proxy**: redirige las peticiones que van hacia `/api/*` directamente al contenedor `api:3000`.
   - Expone la aplicación en el puerto `8080`.

#### Pasos para ejecutar la Opción 2:
```bash
# 1. Crear el archivo de entorno en la raíz y reemplazar TODOS los valores CAMBIAR_*.
#    .env contiene secretos: nunca lo subas a Git.
cp .env.example .env

# 2. Construir las imágenes y levantar todos los contenedores en segundo plano
docker compose up -d --build

# 3. Ver el estado y logs de los servicios
docker compose ps
docker compose logs -f

# 4. Detener todos los servicios cuando termines
docker compose down
```
- **Aplicación web lista**: http://localhost:8080
- **API directa**: http://localhost:3000/api/health
Usuarios demo (clave `Cambiar123*`): admin, gerente1, cajero1, barista1, bodega1. Datos de ejemplo: `database/demo/02_demo.sql`.

## Migraciones y cuentas demo de portales

### Migraciones multiplataforma

`POSTGRES_USER` es el rol administrador usado por Docker para inicializar/migrar la BD. La aplicación usa el rol global restringido `WEB_DB_USER` (por defecto `web_user`) y su contraseña `WEB_DB_PASSWORD`.

Para una base existente, ejecuta:

```powershell
docker compose up -d db
pnpm db:migrate
pnpm db:seed
```

El runner se conecta con `DATABASE_URL` o con `POSTGRES_*`, registra cada archivo en `public.schema_migrations` con SHA-256 y no reaplica archivos ya registrados. Si un archivo aplicado cambia, falla para evitar deriva del esquema.

### Flujo automatizado recomendado

El backend usa Sequelize con PostgreSQL. Los CRUD de los módulos implementados se realizan con modelos Sequelize; las vistas y funciones PL/pgSQL críticas se invocan con consultas parametrizadas de Sequelize para conservar la lógica atómica de la base. Las migraciones y seeders SQL se ejecutan con `scripts/db.js`:

```powershell
# Desde la raíz del proyecto; toma DATABASE_URL o POSTGRES_* del entorno
pnpm db:migrate
pnpm db:seed
```

Los archivos se leen ordenados por nombre y se ejecutan dentro de transacciones. No se usa sincronización automática de modelos en producción: el esquema y las funciones críticas continúan versionados como SQL.

Para una base nueva, `database/init/01_schema.sql` se ejecuta automáticamente mediante `/docker-entrypoint-initdb.d/`. Para una base existente, usa `pnpm db:migrate` y después `pnpm db:seed`; no edites el schema inicial ni dependas de `docker compose cp`.

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
