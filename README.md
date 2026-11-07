<div align="center">

# artesa

### ERP + POS para la gestión integral de una cafetería y panadería artesanal

![Node](https://img.shields.io/badge/Node-22-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-API_REST-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-estilos-06B6D4?logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

*Proyecto de cátedra — Programación Web (ciclo 02-2026)*

</div>

---

## Tabla de contenidos

- [Propósito del proyecto](#propósito-del-proyecto)
- [Funcionalidades principales](#funcionalidades-principales)
- [Arquitectura y estructura del proyecto](#arquitectura-y-estructura-del-proyecto)
  - [Arquitectura general](#arquitectura-general)
  - [Estructura de carpetas](#estructura-de-carpetas)
  - [Stack tecnológico](#stack-tecnológico)
- [Guía rápida de instalación y ejecución](#guía-rápida-de-instalación-y-ejecución)
  - [Requisitos previos](#requisitos-previos)
  - [Opción 1: desarrollo local con pnpm](#opción-1-desarrollo-local-con-pnpm)
  - [Opción 2: entorno completo con Docker Compose](#opción-2-entorno-completo-con-docker-compose)
  - [Resumen de URLs y puertos](#resumen-de-urls-y-puertos)
- [Base de datos: esquema y migraciones](#base-de-datos-esquema-y-migraciones)
- [Flujo de uso y casos de ejemplo](#flujo-de-uso-y-casos-de-ejemplo)
- [Credenciales de prueba](#credenciales-de-prueba)
- [Trabajo con agentes de IA](#trabajo-con-agentes-de-ia)
- [Flujo de trabajo colaborativo (Git Flow)](#flujo-de-trabajo-colaborativo-git-flow)
- [Equipo](#equipo)
- [Preguntas frecuentes y solución de problemas](#preguntas-frecuentes-y-solución-de-problemas)

---

## Propósito del proyecto

Los negocios de alimentos artesanales (cafeterías, panaderías) suelen llevar sus operaciones en cuadernos, hojas de cálculo y herramientas desconectadas: las ventas por un lado, el inventario por otro, y la planilla en un tercer archivo. El resultado son inventarios desactualizados, cierres de caja que no cuadran y decisiones tomadas sin datos.

**artesa** unifica esas operaciones en una sola aplicación web:

- **POS (punto de venta):** registra ventas y cobros en mostrador.
- **ERP (planificación de recursos):** administra inventario, recetas, compras, personal y reportes sobre una única base de datos, de modo que cada venta descuenta existencias automáticamente.

> **¿Qué es un ERP?** Un sistema que integra en un solo lugar los procesos internos de un negocio (ventas, inventario, compras, recursos humanos), evitando la duplicación de datos entre herramientas.

---

## Funcionalidades principales

| Módulo | Qué resuelve |
|--------|--------------|
| **Seguridad y roles** | Inicio de sesión y permisos diferenciados por rol (administrador, gerente, cajero, barista, bodega). |
| **Inventario y recetas** | Control de existencias, kárdex de movimientos y recetas que relacionan productos con insumos. |
| **POS y facturación** | Registro de ventas, cobro y emisión de comprobantes. |
| **Caja y turnos** | Apertura y cierre de turnos de caja y conciliación del efectivo. |
| **Compras y proveedores** | Catálogo de proveedores y registro de compras de insumos. |
| **RR. HH. y planilla** | Gestión de empleados y cálculo de planilla. |
| **Dashboard y reportes** | Indicadores y reportes del negocio para la toma de decisiones. |
| **Área cliente** | Acceso separado para clientes en `/cliente/login`. |

---

## Arquitectura y estructura del proyecto

### Arquitectura general

El sistema sigue una arquitectura de tres capas: una interfaz React, una API REST en Express y una base de datos PostgreSQL. En modo Docker, Nginx sirve el frontend y reenvía las peticiones `/api/*` al backend.

```mermaid
flowchart LR
    U([Navegador]) -->|":8080"| W["web<br/>React + Nginx"]
    W -->|"/api/* (reverse proxy)"| A["api<br/>Express · Node 22<br/>:3000"]
    A -->|"DB_HOST=db · :5432"| D[("db<br/>PostgreSQL 16<br/>volumen pgdata")]
```

### Estructura de carpetas

> Árbol orientativo con los directorios y archivos clave mencionados en el proyecto. Puede contener archivos adicionales.

```text
artesa/
├── backend/                  # API REST (Express, Node 22)
│   ├── Dockerfile            # Imagen del servicio `api`
│   └── .env.example          # Variables de entorno del backend
├── frontend/                 # Interfaz web (React + Vite + Tailwind)
│   └── .env.example          # Variables de entorno del frontend
├── database/
│   ├── init/                 # Scripts que Docker ejecuta en el primer arranque
│   │   ├── 01_schema.sql             # Esquema: tablas, funciones, triggers, vistas
│   │   ├── 02_create_web_user.sql    # Rol restringido `web_user` para la aplicación
│   │   ├── 03_soft_delete.sql        # Columna `deleted_at` (eliminación lógica)
│   │   └── 04_timestamps.sql         # Columna `modificado_en` + triggers automáticos
│   ├── migrations/           # Migraciones para bases de datos ya existentes
│   ├── seeders/              # Datos iniciales aplicables con `pnpm db:seed`
│   └── demo/
│       └── 02_demo.sql       # Datos de ejemplo para demostración
├── scripts/
│   └── db.js                 # Runner de migraciones y seeders (registra SHA-256)
├── docs/
│   ├── ai/                   # Contexto para agentes de IA y CHANGELOG_AGENTE.md
│   └── USO_IA.md             # Declaración del uso de IA en el proyecto
├── docker-compose.yml        # Orquestación de los servicios db, api y web
├── AGENTS.md                 # Instrucciones comunes para agentes de IA
├── .env.example              # Variables de entorno raíz (usadas por Docker Compose)
└── README.md                 # Este documento
```

| Elemento | Responsabilidad |
|----------|-----------------|
| `backend/` | Lógica de negocio, autenticación y acceso a datos mediante una API REST. |
| `frontend/` | Pantallas de administración, POS y área cliente. |
| `database/init/` | Crea el esquema completo en el primer arranque del contenedor. |
| `database/migrations/` | Aplica cambios incrementales sobre bases con datos existentes. |
| `scripts/db.js` | Ejecuta migraciones y seeders pendientes y detecta cambios no autorizados en archivos ya aplicados. |
| `docs/ai/` | Contexto y bitácora de cambios hechos con asistencia de IA. |

### Stack tecnológico

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend | React, Vite, Tailwind CSS | Recarga en caliente en desarrollo. |
| Backend | Express sobre Node.js 22 | Endpoint de salud: `/api/health`. |
| Base de datos | PostgreSQL 16 (Alpine) | Persistencia en el volumen `pgdata`. |
| Gestor de paquetes | pnpm (workspace) | Un solo `pnpm install` para raíz, backend y frontend. |
| Contenedores | Docker Compose | Servicios `db`, `api` y `web`. |
| Servidor web | Nginx | Sirve estáticos y actúa como reverse proxy hacia la API. |

---

## Guía rápida de instalación y ejecución

Hay dos formas de ejecutar el proyecto. Elige según tu objetivo:

| Criterio | Opción 1: `pnpm` + Docker (solo BD) | Opción 2: Docker Compose completo |
|----------|-------------------------------------|-----------------------------------|
| Uso recomendado | Programar y depurar | Evaluar o simular producción |
| Hot Reload | Sí (backend y frontend) | No |
| Requiere Node y pnpm | Sí | No |
| Requiere Docker | Sí (solo la BD) | Sí (todo el sistema) |
| Frontend | `http://localhost:5173` | `http://localhost:8080` |

### Requisitos previos

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) con Docker Compose
- **Solo para la Opción 1:** Node.js 22 y `pnpm`

```bash
# Instalar pnpm si aún no lo tienes
npm install -g pnpm
```

### Opción 1: desarrollo local con pnpm

Ejecuta únicamente la base de datos en Docker; backend y frontend corren en tu máquina con recarga automática.

```bash
# 1. Crear los archivos de variables de entorno
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# 2. Levantar solo la base de datos PostgreSQL
docker compose up -d db

# 3. Instalar dependencias de todo el workspace (raíz, backend y frontend)
pnpm install

# 4. Iniciar backend y frontend en modo desarrollo
pnpm dev
```

- **Frontend (Vite):** <http://localhost:5173>
- **API (Express):** <http://localhost:3000/api/health>

<details>
<summary><strong>Ejecutar backend o frontend por separado</strong></summary>

```bash
# Solo backend
pnpm --filter artesa-backend dev

# Solo frontend
pnpm --filter artesa-frontend dev
```

</details>

### Opción 2: entorno completo con Docker Compose

Pensada para probar la aplicación tal como correría en producción, sin instalar Node ni pnpm en tu máquina.

<details>
<summary><strong>¿Cómo funciona esta arquitectura? (3 servicios)</strong></summary>

Docker Compose levanta y conecta tres servicios aislados en una misma red virtual interna:

1. **`db` (PostgreSQL 16 Alpine)**
   - Inicializa el esquema (`database/init/01_schema.sql` y siguientes) la primera vez.
   - Persiste los datos en el volumen Docker `pgdata`.
   - Incluye un *healthcheck* (`pg_isready`) para que el backend espere a que la BD esté lista.
2. **`api` (Backend Express)**
   - Se construye con `backend/Dockerfile` sobre una imagen Node 22.
   - Se conecta a la base con `DB_HOST=db` y puerto `5432` (no usa el `localhost` de tu máquina).
   - Expone el puerto `3000`.
3. **`web` (Frontend React + Nginx)**
   - Se compila en una fase *multi-stage* y sirve los archivos estáticos con Nginx.
   - Actúa como **reverse proxy**: redirige `/api/*` al contenedor `api:3000`.
   - Expone la aplicación en el puerto `8080`.

</details>

```bash
# 1. Crear el archivo de entorno raíz
cp .env.example .env
#    Edita .env y reemplaza TODOS los valores CAMBIAR_*

# 2. Construir las imágenes y levantar los contenedores en segundo plano
docker compose up -d --build

# 3. Verificar el estado y revisar los registros
docker compose ps
docker compose logs -f

# 4. Detener los servicios cuando termines
docker compose down
```

> [!WARNING]
> El archivo `.env` contiene secretos. **Nunca lo subas a Git.**

- **Aplicación web:** <http://localhost:8080>
- **API directa:** <http://localhost:3000/api/health>

### Resumen de URLs y puertos

| Servicio | Opción 1 (`pnpm`) | Opción 2 (Docker) |
|----------|-------------------|-------------------|
| Frontend | `http://localhost:5173` | `http://localhost:8080` |
| API (salud) | `http://localhost:3000/api/health` | `http://localhost:3000/api/health` |
| PostgreSQL | `5432` (contenedor `db`) | `5432` (red interna Docker) |

---

## Base de datos: esquema y migraciones

La aplicación usa el rol restringido `WEB_DB_USER` (por defecto `web_user`), definido en `.env`. El rol `POSTGRES_USER` es el administrador que usa Docker.

### Clon fresco (modo recomendado)

Al levantar el contenedor con el volumen vacío, Docker ejecuta **todos** los archivos de `database/init/` en orden alfabético:

| Archivo | Qué hace |
|---------|----------|
| `01_schema.sql` | Esquema completo (tablas, funciones, triggers, vistas). |
| `02_create_web_user.sql` | Rol restringido `web_user` para la aplicación. |
| `03_soft_delete.sql` | Columna `deleted_at` en catálogos (eliminación lógica). |
| `04_timestamps.sql` | Columna `modificado_en` y triggers `BEFORE UPDATE` automáticos. |

```bash
# En un clon limpio basta con esto
docker compose up -d db
```

> [!IMPORTANT]
> Docker solo ejecuta `database/init/` cuando el volumen `pgdata` está **vacío** (primera vez). Si ya tienes datos, aplica las migraciones manualmente.

### ¿Qué método usar?

| Situación | Solución |
|-----------|----------|
| Cloné el repositorio y levanto por primera vez | `docker compose up -d` (automático). |
| Ya tenía datos y llegó una migración nueva | Opción A (`psql`) u Opción B (`pnpm db:migrate`). |
| Quiero un entorno limpio desde cero | `docker compose down -v && docker compose up -d` |

> [!CAUTION]
> `docker compose down -v` **elimina el volumen `pgdata`** y, con él, todos los datos almacenados.

<details>
<summary><strong>Base existente — Opción A: <code>psql</code> directo (más simple)</strong></summary>

```powershell
# Levanta la BD si no está corriendo
docker compose up -d db

# Aplica cada migración pendiente, en orden
docker exec -i artesa-db-1 psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB < database/migrations/003_soft_delete.sql
docker exec -i artesa-db-1 psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB < database/migrations/004_timestamps.sql
```

> Los comandos usan sintaxis de PowerShell (Windows). El nombre `artesa-db-1` puede variar según el nombre de tu carpeta; verifícalo con `docker compose ps`.

</details>

<details>
<summary><strong>Base existente — Opción B: runner <code>scripts/db.js</code> (con registro de migraciones)</strong></summary>

El runner se conecta con `DATABASE_URL` o con las variables `POSTGRES_*` del entorno. Registra cada archivo aplicado en `public.schema_migrations` junto con su hash SHA-256 y **no reaplica** archivos ya registrados. Si un archivo ya aplicado fue modificado, falla para evitar deriva del esquema.

```powershell
docker compose up -d db
pnpm db:migrate   # aplica las migraciones pendientes de database/migrations/
pnpm db:seed      # aplica los seeders pendientes de database/seeders/
```

</details>

---

## Flujo de uso y casos de ejemplo

Con la aplicación en marcha (consulta [Guía rápida](#guía-rápida-de-instalación-y-ejecución)), sigue estos recorridos para validar las funciones principales. Las credenciales están en [Credenciales de prueba](#credenciales-de-prueba).

### Caso 0: verificar que el sistema está vivo

```bash
curl http://localhost:3000/api/health
```

Si la API y su conexión funcionan, recibirás una respuesta exitosa. Si falla, revisa [Preguntas frecuentes](#preguntas-frecuentes-y-solución-de-problemas).

### Caso 1: ingresar al área administrativa

1. Abre `/admin/login` (por ejemplo, `http://localhost:8080/admin/login`).
2. Inicia sesión con `admin` / `Cambiar123*`.
3. Explora los módulos disponibles para ese rol.

### Caso 2: probar los permisos por rol

1. Cierra sesión e ingresa con otro usuario demo, por ejemplo `cajero1`.
2. Observa que solo ves las opciones correspondientes a su rol.
3. Repite con `bodega1` y compara las diferencias.

### Caso 3: recorrido sugerido de una jornada

| Paso | Usuario | Acción |
|------|---------|--------|
| 1 | `gerente1` | Revisar catálogo, recetas e inventario de ejemplo. |
| 2 | `cajero1` | Abrir turno de caja y registrar una venta en el POS. |
| 3 | `bodega1` | Consultar el inventario y comprobar el movimiento generado por la venta. |
| 4 | `gerente1` | Cerrar el turno y revisar el dashboard y los reportes. |

> Los pasos del Caso 3 describen el recorrido previsto de los módulos; los nombres exactos de pantallas y botones pueden variar según el avance de cada módulo.

### Caso 4: probar el área de clientes

1. Abre `/cliente/login`.
2. Inicia sesión con `cliente.demo` / `Cliente123*`.

---

## Credenciales de prueba

> [!NOTE]
> Estas credenciales son solo para demostración. Los datos de ejemplo se encuentran en `database/demo/02_demo.sql`. **No las uses en producción.**

| Área | Usuario | Contraseña | Ruta de acceso |
|------|---------|-----------|----------------|
| Administrativa | `admin` | `Cambiar123*` | `/admin/login` |
| Administrativa | `gerente1` | `Cambiar123*` | `/admin/login` |
| Administrativa | `cajero1` | `Cambiar123*` | `/admin/login` |
| Administrativa | `barista1` | `Cambiar123*` | `/admin/login` |
| Administrativa | `bodega1` | `Cambiar123*` | `/admin/login` |
| Cliente | `cliente.demo` | `Cliente123*` | `/cliente/login` |

---

## Trabajo con agentes de IA

El proyecto admite asistentes como **opencode**, **Cursor** y **Antigravity**.

- Todos leen el archivo `AGENTS.md` (`GEMINI.md` y `.cursor/rules` solo apuntan a él).
- El contexto adicional está en `docs/ai/`.
- Cada cambio realizado con IA se registra en `docs/ai/CHANGELOG_AGENTE.md`.
- El uso de IA se declara en `docs/USO_IA.md`.

---

## Flujo de trabajo colaborativo (Git Flow)

Se usa una adaptación práctica de **Git Flow**:

| Rama | Propósito | Reglas |
|------|-----------|--------|
| `main` | Versiones estables, listas para entrega o defensa. | Protegida; no se hacen commits directos. |
| `develop` | Integración diaria. | Recibe el trabajo completado y probado. |
| `feature/<modulo>-<descripcion>` | Una funcionalidad individual. | Ej.: `feature/pos-cobro`, `feature/inventario-kardex`. |

### Crear una rama de trabajo

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<modulo>-<descripcion>
```

### Convención de commits

Se usa **Conventional Commits**, en minúsculas y en español:

| Prefijo | Uso | Ejemplo |
|---------|-----|---------|
| `feat(<modulo>)` | Nueva funcionalidad | `feat(pos): agregar cobro en efectivo` |
| `fix(<modulo>)` | Corrección de errores | `fix(caja): corregir cierre de turno` |
| `docs` | Documentación | `docs: actualizar guía de instalación` |
| `refactor` | Reestructuración sin cambio funcional | `refactor: simplificar servicio de inventario` |
| `chore` | Tareas de mantenimiento | `chore: actualizar dependencias` |

### Integrar los cambios

Al terminar tu funcionalidad, sube la rama y abre un **Pull Request (PR)** hacia `develop`:

```bash
git push -u origin feature/<modulo>-<descripcion>
```

---

## Equipo

| Módulo | Responsables | Rama |
|--------|--------------|------|
| Seguridad y roles | | `feature/seguridad-*` |
| Inventario y recetas | | `feature/inventario-*` |
| POS y facturación | | `feature/pos-*` |
| Caja y turnos | | `feature/caja-*` |
| Compras y proveedores | | `feature/compras-*` |
| RR. HH. y planilla | | `feature/rrhh-*` |
| Dashboard y reportes | | `feature/reportes-*` |
| Documentación, IEEE, despliegue | | `feature/docs-*` |

---

## Preguntas frecuentes y solución de problemas

<details>
<summary><strong>Cambié los scripts de <code>database/init/</code> pero la base no se actualiza</strong></summary>

Docker solo ejecuta esos scripts cuando el volumen `pgdata` está vacío. Para recrear la base desde cero (se pierden los datos):

```bash
docker compose down -v && docker compose up -d
```

Para conservar los datos, usa las migraciones (ver [Base de datos](#base-de-datos-esquema-y-migraciones)).

</details>

<details>
<summary><strong><code>docker exec</code> falla con "No such container: artesa-db-1"</strong></summary>

El nombre del contenedor depende del nombre de la carpeta del proyecto. Consúltalo con:

```bash
docker compose ps
```

Luego sustituye `artesa-db-1` por el nombre que aparezca. También puedes usar la Opción B (`pnpm db:migrate`), que no depende de ese nombre.

</details>

<details>
<summary><strong>El backend no conecta con la base de datos</strong></summary>

- **Opción 1 (`pnpm`):** confirma que la BD está activa con `docker compose ps` y que `backend/.env` apunta a `localhost`.
- **Opción 2 (Docker):** la API debe usar `DB_HOST=db`, no `localhost`; dentro de un contenedor, `localhost` es el propio contenedor.
- Revisa los registros con `docker compose logs -f db api`.

</details>

<details>
<summary><strong>Los puertos 3000, 5173, 5432 u 8080 ya están ocupados</strong></summary>

Otro programa está usando el puerto. Detén ese proceso o cambia el puerto en tu configuración. Para ver qué contenedores tuyos ocupan puertos, ejecuta `docker compose ps`.

</details>

<details>
<summary><strong><code>pnpm: command not found</code></strong></summary>

Instálalo con `npm install -g pnpm` y abre una nueva terminal.

</details>

<details>
<summary><strong>El runner <code>pnpm db:migrate</code> falla indicando que un archivo cambió</strong></summary>

El runner compara el hash SHA-256 de cada migración ya aplicada. Si editaste un archivo que ya estaba registrado, falla a propósito para evitar inconsistencias. No modifiques migraciones aplicadas: crea una **nueva** migración con el cambio.

</details>

<details>
<summary><strong>¿Puedo usar las credenciales demo en producción?</strong></summary>

No. Son datos de demostración con contraseñas conocidas. Para un despliegue real, reemplaza todos los valores `CAMBIAR_*` de `.env` y elimina o cambia los usuarios demo.

</details>

---

<div align="center">

**artesa** · Programación Web · Ciclo 02-2026

</div>