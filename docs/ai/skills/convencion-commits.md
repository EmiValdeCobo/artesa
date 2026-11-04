---
name: convencion-commits
description: >-
  Estandariza los mensajes de confirmación de Git en artesa utilizando la combinación estricta
  de Gitmoji y Conventional Commits: <emoji> <tipo>(<alcance>): <descripción>.
triggers:
  - commit
  - commits
  - git commit
  - mensaje de commit
  - mensajes de commit
  - convencion de commits
  - gitmoji
  - conventional commits
  - formato commit
lee_antes:
  - AGENTS.md
  - docs/ai/PROTOCOLO_CONTEXTO.md
no_hacer:
  - No generar commits sin emoji o sin tipo Conventional Commits
  - No omitir los dos puntos y espacio después del alcance: obligatorio `: `
  - No usar mayúsculas en el tipo ni en el alcance
  - No colocar punto final al cierre de la descripción corta
  - No mezclar múltiples tareas no relacionadas en un único commit (mantener atomicidad)
salida_esperada: >-
  Mensaje de commit en formato estricto <emoji> <tipo>(<alcance>): <descripción>
---

# Convención de Commits: Gitmoji & Conventional Commits

En el proyecto **artesa**, todos los mensajes de confirmación de Git deben cumplir de manera estricta el estándar unificado de **Gitmoji** y **Conventional Commits**.

---

## 1. Estructura Estricta

Todo mensaje de commit debe seguir obligatoriamente la siguiente plantilla:

```text
<emoji> <tipo>(<alcance>): <descripción>
```

### Reglas de los componentes:
1. **`<emoji>`**: Emoji UTF-8 representativo del propósito del cambio (según catálogo Gitmoji). Debe ir seguido de un **espacio simple**.
2. **`<tipo>`**: Tipo de cambio en **minúsculas** bajo la especificación Conventional Commits (`feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`, `test`, `security`, `ci`, `revert`, `db`, `config`).
3. **`(<alcance>)`**: Área, módulo o capa técnica afectada escrita en **minúsculas** y encerrada entre paréntesis. No debe contener espacios internos.
4. **`: `**: Dos puntos seguidos de un **espacio simple**.
5. **`<descripción>`**: Resumen breve y concreto en español, comenzando en **minúscula**, redactado en imperativo o infinitivo, y **sin punto final**.

---

## 2. Catálogo de Emojis y Tipos

| Emoji | Tipo | Propósito | Cuándo usarlo |
|---|---|---|---|
| ✨ | `feat` | Nueva característica | Añadir endpoints, pantallas, funciones o nuevas capacidades al sistema. |
| 🐛 | `fix` | Corrección de error | Resolver un bug en UI, fallo en endpoints, cálculo erróneo o error 500. |
| ♻️ | `refactor` | Refactorización | Reestructuración de código sin alterar funcionalidad externa ni corregir bugs. |
| 🚀 | `chore` / `deploy` | Despliegue o tareas operativas | Preparación de builds, configuración de arranque o tareas de soporte. |
| 📦 | `chore(deps)` | Gestión de dependencias | Agregar, actualizar o eliminar paquetes y librerías en `package.json` o gestores. |
| 📝 | `docs` | Documentación | Cambios en README, especificaciones IEEE, diagramas, bitácoras o `docs/ai`. |
| 💄 | `style` | Formato y apariencia menor | Ajustes de Prettier/ESLint, espaciado o detalles puramente cosméticos. |
| ⚡ | `perf` | Rendimiento | Optimización de consultas SQL, memoización en React, reducción de latencia. |
| 🔒 | `security` | Seguridad | Fortalecimiento de hashing, parches de vulnerabilidades, RBAC o sanitización. |
| 🗃️ | `db` | Base de datos | Creación o actualización de migraciones SQL, vistas o funciones PL/pgSQL. |
| 🧪 | `test` | Pruebas | Añadir o modificar tests unitarios, de integración o suites E2E. |
| 👷 | `ci` | Integración / Entrega Continua | Cambios en pipelines, GitHub Actions, Dockerfile o scripts de despliegue. |
| 🔧 | `config` | Configuración | Modificación de variables de entorno, vite.config.js o ajustes del entorno. |
| ⏪ | `revert` | Reversión | Revertir un commit previo debido a fallos o cambios de requerimiento. |

---

## 3. Alcances (`<alcance>`) Recomendados en artesa

El alcance identifica la sección del proyecto afectada. Usa siempre minúsculas:

### Módulos de Negocio (Esquemas BD):
- `auth`: Autenticación, JWT, sesiones, login, logout.
- `seguridad`: RBAC, roles, permisos, middleware de autorización.
- `empresa`: Datos de la empresa, sucursales, parámetros tributarios.
- `inventario`: Insumos, recetas, mermas, existencias, kardex.
- `pos`: Terminal punto de venta, comandas, mesas, facturación DTE.
- `caja`: Turnos de caja, aperturas, arqueos, cortes X/Z.
- `compras`: Proveedores, órdenes de compra, recepción de mercadería.
- `rrhh`: Empleados, asistencia, turnos de personal, planillas.
- `reportes`: Vistas analíticas, reportes financieros y exportaciones.

### Capas Técnicas y Transversales:
- `ui`: Componentes visuales generales, botones, modales, formularios, layouts.
- `dao` / `repository`: Capa de persistencia y consultas SQL directas.
- `service`: Capa de reglas de negocio en backend.
- `api` / `routes`: Enrutamiento Express, middlewares y controladores HTTP.
- `db`: Migraciones, esquemas y funciones SQL.
- `deps`: Actualización o adición de dependencias y librerías.
- `infra` / `docker`: Docker Compose, scripts de arranque, redes o proxies.
- `config`: Configuraciones de empaquetado, tooling o variables de entorno.
- `docs`: Archivos de documentación general y guías técnicas.

---

## 4. Ejemplos de Referencia

### Casos Válidos (Formato Estricto):
```bash
✨ feat(auth): agregar validación de login con base de datos
🐛 fix(ui): corregir alineación de tarjetas en el dashboard
♻️ refactor(dao): optimizar consultas preparadas de UsuarioDAO
🚀 chore(deps): agregar dependencia de jakarta-mail al build.gradle
📦 chore(deps): instalar @tailwindcss/vite y clsx en frontend
📝 docs(readme): actualizar instrucciones para levantar contenedores docker
⚡ perf(db): indexar columna estado en pos.ventas para acelerar listados
🔒 security(rbac): validar permisos de anulación en turnos de caja
🗃️ db(schema): crear migración 002 para tabla cortes_caja
🧪 test(auth): añadir pruebas de expiración de token jwt
```

### Casos Inválidos (Errores Comunes a Evitar):
| Mensaje Inválido | Causa del Error | Corrección |
|---|---|---|
| `fix(ui): arreglar cards` | Falta el emoji obligatorio al inicio | `🐛 fix(ui): arreglar tarjetas del contenedor` |
| `🐛 fix: correccion visual` | Falta el alcance obligatorio entre paréntesis | `🐛 fix(ui): corregir desfase en tarjetas de ventas` |
| `✨ Feat(Auth): Agregar Login.` | Mayúsculas en tipo/alcance y punto final prohibido | `✨ feat(auth): agregar autenticación de usuario` |
| `🐛fix(ui): corregir tarjetas` | Falta el espacio entre el emoji y el tipo | `🐛 fix(ui): corregir tarjetas` |
| `♻️ refactor(dao) optimizar consultas` | Faltan los dos puntos y espacio `: ` tras el alcance | `♻️ refactor(dao): optimizar consultas` |
| `✨ feat: varios cambios en todo el sistema` | Commit no atómico y descripción vaga | Dividir en commits atómicos por módulo |

---

## 5. Protocolo de Ejecución para Agentes y Desarrolladores

Antes de realizar el commit:
1. Verifica que los cambios pertenezcan a una **unidad lógica atómica** (no mezclar cambios de backend con estilos o dependencias no relacionadas).
2. Asegúrate de haber completado las validaciones requeridas (pruebas locales, validación Zod, linters).
3. Si eres un agente de IA:
   - Registra primero la línea en `docs/ai/CHANGELOG_AGENTE.md`.
   - Propón o genera el comando git con el formato exacto:
     ```bash
     git add <archivos-específicos>
     git commit -m "<emoji> <tipo>(<alcance>): <descripción>"
     ```
