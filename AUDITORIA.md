# AUDITORÍA — artesa (ERP + POS)

> Auditoría **solo lectura** del código. Fecha: 2026-11-18 · Rama: `develop` · Alcance: UI/Diseño, UX+Accesibilidad, Flujo end-to-end, Seguridad + dependencias.
> Método: 4 subagentes en paralelo (uno por área) + verificación por muestreo de los hallazgos de mayor severidad + `pnpm audit`.
> Skills usados (equivalentes a los solicitados, que **no están instalados**): `frontend-design` y `ui-ux-pro-max` (UI/UX/a11y), `security-review` y `code-review` (seguridad). El plugin `audit-suite`/`full-audit` y los skills `design-critique`/`accessibility-review`/`ux-copy` no existen en este entorno.
> No se modificó ningún archivo de código. Único archivo creado: este `AUDITORIA.md`.

---

## 1. Resumen ejecutivo

El proyecto es **maduro y de calidad notablemente alta**: sistema de diseño en 3 capas de tokens con modo claro/oscuro, **autorización robusta en backend** (RBAC con `authenticate` + `requirePermiso` en todas las escrituras, aislamiento real anti-IDOR por sucursal, SQL siempre parametrizado, sesión JWT en cookie `httpOnly` con revocación por `jti`) y componentes de a11y ejemplares (`Dialogo`, toasts, combobox). **No se hallaron vulnerabilidades críticas ni altas de seguridad** (sin SQLi, sin authz faltante, sin secretos versionados, sin robo de token por XSS). Los problemas de mayor impacto son **funcionales/de flujo**: la anulación de venta existe completa en backend pero **no tiene punto de entrada en la UI**, y el cliente HTTP **descarta los headers de respuesta**, por lo que Kárdex, CxP y Compras muestran solo la primera página (~50 filas) y hasta un total falso de "500". El resto son hallazgos de hardening (seguridad), a11y en los drawers de inventario, consistencia de tokens y documentación (`CONTEXT.md`) desincronizada con el código.

**Conteo:** 0 Críticas · 7 Altas · 6 Medias · 11 Bajas · 13 vulns de dependencias (1 alta, 11 moderadas, 1 baja).

---

## 2. Tabla de hallazgos

Severidad: Crítica / Alta / Media / Baja · Esfuerzo: S (≤1 h) / M (≤medio día) / L (>1 día). ✓ = verificado por muestreo en esta auditoría.

| ID | Área | Problema | archivo:línea | Sev. | Corrección sugerida | Esf. | Skill |
|----|------|----------|---------------|------|---------------------|------|-------|
| C1 | Flujo | **Anular venta sin UI**: `anularVenta()` definida pero nunca invocada; el modal de detalle solo "Cerrar"/"Imprimir". Backend completo (`PATCH /pos/ventas/:id/anular`, `POS_ANULAR_VENTA`, `fn_anular_venta`) queda inalcanzable. ✓ | `frontend/src/modules/pos/posApi.js:124` · `.../pos/VentasHistorialPage.jsx:406-417` | **Alta** | Botón "Anular venta" en el modal (si `tiene('POS_ANULAR_VENTA')` y estado≠ANULADA) con `confirm`+captura de motivo → `anularVenta`. | M | — |
| C2 | Flujo | **El cliente HTTP descarta todos los headers de respuesta** (`return data;`); nunca expone `response.headers`. Raíz de que la paginación por headers sea ilegible en toda la app. ✓ | `frontend/src/api/client.js:76` | **Alta** | Devolver `{ data, meta }` o un `api.getConMeta` que lea `X-Page/X-Total/...`. | M | code-review |
| C3 | Flujo | **Kárdex no pide páginas y muestra un total falso**: hace `GET /inventario/movimientos` sin `page`/`limit` (backend default 50/máx 100) pero rotula "500 más recientes". Páginas 2+ inalcanzables, dato perdido en silencio. ✓ | `frontend/src/modules/inventario/KardexPage.jsx:18,131-133,423,429` | **Alta** | Enviar `page`/`limit` y paginar en servidor leyendo `X-Total` (depende de C2); mínimo: `TOPE_API=100` + `limit=100`. | M | — |
| C4 | Flujo | **CxP/Compras solo ven la primera página de 50**: `listarCuentasPorPagar` no envía `page`/`limit`; la UI trata el arreglo como lista completa. Backend pagina obligatorio. ✓ | `frontend/src/modules/compras/comprasApi.js:8-11` · `CuentasPorPagarPage.jsx:110` · `ComprasPage.jsx:28` | **Alta** | Igual que C3 (depende de C2): paginación de servidor + aviso si faltan registros. | M | — |
| B1 | UX/a11y | **Drawers de inventario sin trampa de foco** ni foco inicial/restaurado (Tab se escapa "detrás" del modal). La solución correcta ya existe en `Dialogo.jsx:34-72` pero no la reusan. | `frontend/src/modules/inventario/InsumoDrawer.jsx:92-107` · `CatalogoProductosPage.jsx:62-68,1021-1026` | **Alta** | Reusar `Dialogo.jsx` (variante drawer) o replicar su trampa de foco + retorno al disparador. | M | ui-ux-pro-max |
| D1 | Seguridad | **Usuarios demo con contraseña conocida en el init schema**: `01_schema.sql` inserta `admin` con `crypt('Cambiar123*',...)`. El seeder JS aborta en producción, pero el schema base no. Riesgo de desplegar con ADMIN de contraseña pública. | `database/init/01_schema.sql:956-963` · `backend/seeders/datos/catalogo.js:4` | **Media** | No sembrar usuarios con contraseña fija en el schema; mover a seeder no-productivo o forzar cambio en primer login. | S | security-review |
| DEP1 | Seguridad | **13 vulnerabilidades de dependencias** (1 alta, 11 moderadas, 1 baja). Runtime: `react-router <7.18.0` (open redirect + constructor injection) y `uuid <11.1.1` (vía sequelize). El resto es tooling de desarrollo (vite/esbuild/launch-editor/minimatch). ✓ | `frontend/package.json` (react-router) · `backend` (sequelize>uuid) · dev: vite/esbuild | **Media** (runtime) / Baja (dev) | `pnpm up react-router-dom@^7.18 uuid`; actualizar vite a ≥6.4.4 (dev). Revisar breaking changes de react-router 7. | M | security-review (pnpm audit) |
| A1 | UI | **Clase `bg-canvas` inexistente** (token no definido en `index.css` ni Tailwind): el chip "Sin sucursal asignada" queda con fondo transparente. ✓ | `frontend/src/modules/dashboard/DashboardPage.jsx:95` | Media | Sustituir por `bg-muted` (o `bg-surface`). | S | frontend-design |
| B2 | UX/a11y | **Errores de campo sin asociación ARIA**: inputs renderizan `<CampoError>` pero sin `aria-invalid`/`aria-describedby`; el lector no anuncia el error. El módulo seguridad sí lo hace bien. | `InsumoDrawer.jsx:156-165` · `CatalogoProductosPage.jsx:1053-1066` · `CatalogoInsumosPage.jsx:159-185` | Media | Añadir `aria-invalid` + `aria-describedby={idError(id)}` (patrón `describir()` de seguridad). | S | ui-ux-pro-max |
| B3 | UX/a11y | **Falta enlace "Saltar al contenido"** (WCAG 2.4.1): el usuario de teclado tabula toda la sidebar en cada página. | `frontend/src/layout/AppLayout.jsx:27` · `Sidebar.jsx:292` | Media | Enlace `sr-only`/focus-visible al inicio apuntando a `id` en `<main>`. | S | ui-ux-pro-max |
| C5 | Flujo | **No existe selector de sucursal GLOBAL** (solo `AuthContext`); cada pantalla mantiene su propio `useState`. `CONTEXT.md:21` dice "global" → documentación falsa. Mitigado por fallback a `usuario.sucursales[0]`. ✓ | `frontend/src/context/` (solo `AuthContext.jsx`) · `DashboardPage.jsx:35`, `KardexPage.jsx:85`, etc. | Media | Introducir `SucursalContext`/localStorage compartido, o corregir la redacción de `CONTEXT.md`. | M / S | — |
| A2 | UI | **El Dashboard anula la fuente display** (Fraunces→Montserrat) vía override; el `<h1>` de inicio luce distinto al resto de la app, sin justificación. ✓ | `frontend/src/modules/dashboard/dashboard.css:11` · `components/display/EncabezadoPagina.jsx:14` | Baja/Media | Eliminar el override `--font-display: var(--font-sans)` o documentar la intención. | S | frontend-design |
| A5 | UI | Contraste `text-fg-subtle` (#756a5d) sobre `bg-muted` (#efebe4) ≈4,4:1, rozando el AA 4,5:1 para texto normal. *No verificado con herramienta exacta.* | `frontend/src/index.css:99` · uso en `pos/ProductoCard.jsx:17` | Baja | Usar `text-fg-muted` para metadatos sobre `bg-muted`, o ajustar el tono del token. | S | ui-ux-pro-max |
| D2 | Seguridad | **`express.json()` sin límite de tamaño** de cuerpo (hay endpoints con arreglos: ítems de venta, permisos). ✓ | `backend/src/app.js:21` | Baja/Media | `express.json({ limit: '100kb' })`. | S | security-review |
| D3 | Seguridad | **Rate limiting solo en login**; el resto de la API (PDFs de planilla, reportes costosos) sin throttling. | `backend/src/modules/auth/auth.controller.js:4-11` · `app.js` | Baja | `express-rate-limit` global moderado tras `trust proxy`. | S | security-review |
| D4 | Seguridad | **`jwt.verify` sin fijar algoritmo** (`{ algorithms: ['HS256'] }`); riesgo bajo con secreto string, pero es la práctica recomendada. ✓ | `backend/src/middlewares/auth.js:14` · `auth.service.js:75` | Baja | Fijar `algorithms` en verify y `algorithm` en sign. | S | security-review |
| D5 | Seguridad | **CSRF depende solo de `SameSite=lax` + CORS**; sin token anti-CSRF. Razonable para esta app, pero conviene documentarlo/endurecer. | `backend/src/config/env.js:57` · `app.js:15-19` · `auth.js:11` | Baja | Documentar estrategia; opcional `SameSite=strict` en prod o double-submit. | S/M | security-review |
| A3 | UI | Hex hardcodeado en el degradado del Splash (coincide con Espresso pero no referencia tokens; no adaptable a tema). | `frontend/src/pages/SplashScreen.jsx:10` | Baja | Usar `var(--color-espresso-...)`. | S | frontend-design |
| A4 | UI | Ilustración SVG del login con ~20 hex crudos de la paleta en lugar de tokens (arte decorativo, no adapta a oscuro). | `frontend/src/pages/LoginPage.jsx:19-52` | Baja | Opcional: mapear fills a `var(--color-*)`. | M | ui-ux-pro-max |
| B4 | UX/a11y | `<li onClick>` como botón falso en panel de alertas; **bien mitigado** (`role="button"`, `tabIndex`, `onKeyDown`). Deuda menor. | `frontend/src/modules/dashboard/paneles/AlertasPanel.jsx:47-58` | Baja | Usar `<button>`/`<Link>` nativo cuando hay `ruta`. | S | ui-ux-pro-max |
| B5 | UX/a11y | Contraste de placeholder `text-fg-subtle` en formularios. *No verificado* (requiere resolver variables en ambos temas). | `frontend/src/components/forms/CampoTexto.jsx:16` · `CustomSelect.jsx:246` | Baja (no verif.) | Medir ratio sobre surface/muted en claro y oscuro; subir tono si <4.5:1. | S | ui-ux-pro-max |
| C6 | Flujo | **`CONTEXT.md` desactualizado** (RRHH "pendiente" ya implementado) + **import muerto** `PendienteApiPage` sin uso en rutas. ✓ | `frontend/src/App.jsx:24` · `CONTEXT.md:39,43` | Baja | Actualizar `CONTEXT.md` y quitar el import muerto. | S | — |
| C7 | Flujo | `rrhh/puestos` protegido con `RRHH_GESTIONAR_EMPLEADOS` (¿debería ser un permiso de puestos?). *No verificado contra catálogo `seguridad.permisos`.* | `frontend/src/App.jsx:89` | Baja (no verif.) | Confirmar el código de permiso correcto para puestos. | S | — |
| C8 | Flujo | **Sin página 404 dedicada**: `path="*"` redirige al Dashboard; oculta enlaces rotos. | `frontend/src/App.jsx:152` | Baja | Página 404 con enlace a inicio. | S | — |
| C9 | Flujo | `authenticate` aún acepta `payload.tipo === 'cliente'` pese a que el portal de clientes fue eliminado (rama residual). ✓ | `backend/src/middlewares/auth.js:15` | Baja | Restringir a `'admin'` y limpiar la rama residual. | S | code-review |

---

## 3. Top 5 arreglos por impacto

1. **C1 — Habilitar "Anular venta" en la UI.** Toda la cadena de negocio (ruta, permiso `POS_ANULAR_VENTA`, `fn_anular_venta`) existe y está protegida, pero es **inalcanzable para el usuario**. Es la brecha funcional de mayor impacto y la de defensa más visible en una demo. Esfuerzo M.
2. **C2 → C3/C4 — Arreglar la paginación de raíz.** Hacer que `client.js` exponga los headers (`X-Total`, `X-Page`…) y que Kárdex, CxP y Compras pidan páginas. Hoy muestran solo ~50 filas y un total falso: **riesgo de decidir con datos incompletos sin que el usuario lo note**. Un solo cambio en el cliente desbloquea las tres pantallas. Esfuerzo M.
3. **B1 + B2 + B3 — Accesibilidad de formularios/drawers de inventario.** Trampa de foco en los drawers (reusando `Dialogo.jsx`), asociación ARIA de errores y un skip-link. Son usuarios de teclado/lector quedando fuera; el patrón correcto ya vive en el repo (seguridad + `Dialogo`). Esfuerzo S–M.
4. **D1 + D2 + D3 + D4 — Hardening de seguridad de bajo costo.** No sembrar `admin/Cambiar123*` desde el schema base (o forzar cambio en primer login), fijar `express.json({limit})`, rate-limit global y `algorithms:['HS256']`. Todo esfuerzo S, cierra el frente de "despliegue inseguro".
5. **DEP1 — Actualizar dependencias con vuln de runtime.** `react-router` ≥7.18 (open redirect/constructor injection) y `uuid` ≥11.1.1; de paso `vite` ≥6.4.4 (1 alta en el servidor de desarrollo). Revisar breaking changes de react-router 7. Esfuerzo M.

---

## 4. Lo que está bien hecho

**Seguridad (muy sólida):**
- Autorización backend **uniforme**: 15 archivos de rutas revisados, **ningún** POST/PUT/PATCH/DELETE sin `authenticate` + `requirePermiso` (`seguridad.routes.js:11-34`, `pos/ventas/ventas.routes.js:14-44`, `caja.routes.js:11-22`).
- **Anti-IDOR real** por sucursal vía `usuarioTieneSucursal(...)`, nunca confía en el `id_sucursal` del cliente (`ventas.service.js:56,99`, `caja.service.js:35,138`); lecturas filtradas por `seguridad.usuario_sucursal` en SQL.
- **SQL siempre parametrizado** (`bind`/`$1`); los builders dinámicos construyen placeholders, no interpolan valores. Precios re-tomados de BD (`ordenes.service.js:29-34`).
- Sesión JWT `httpOnly`+`sameSite`+`secure` configurable, exp 8h, revocación por `jti` (`tokens_revocados`), revalidación de usuario/rol en cada request (`auth.js:18-29`). Login sin fuga de info + anti-timing con `DUMMY_HASH` + rate limit (`auth.service.js:66-71`).
- Frontend sin token en JS (cookie httpOnly), **cero** `dangerouslySetInnerHTML`; bitácora redacta `password_hash`/`token` (`bitacora.repository.js:30,48-49`).

**Flujo:** manejo de expiración de sesión/401 sin bucles (`client.js:20-24`, `AuthContext.jsx:44-54`); cobro POS blindado (no se cobra sin turno, mensaje accionable); cierre de turno con doble resguardo; 403 con componente claro `AccesoDenegado`.

**UI:** tokens en 3 capas con modo claro/oscuro y contraste documentado (`index.css:20-232`); **cero "AI slop"** (sin emojis como íconos, sin glassmorphism/sombras exageradas, fuentes reales vía @fontsource); estados compartidos (`EstadoVacio`/`Skeleton`/`BannerError`) con 250 usos en 34 archivos; responsividad con tablas apilables y `prefers-reduced-motion` honrado.

**UX/a11y:** `Dialogo.jsx` modélico (trampa de foco, retorno, pila de modales, Escape); acciones destructivas siempre confirmadas nombrando el objeto, con foco inicial en "Cancelar"; errores traducidos a español por canal (modal/banner/toast); toasts conformes a WCAG (pausa en hover, regiones live); `BotonIcono` con `aria-label` y zona táctil 40px; `CustomSelect` combobox accesible completo.

---

## 5. Notas de método y verificación

- **Verificados por muestreo** (reabriendo `archivo:línea`): C1, C2, C3, C4, C5, C6, C9, A1, A2, D2, D4 y el resumen de `pnpm audit`. El resto proviene de los subagentes con cita de evidencia.
- **No verificados** (marcados en la tabla): A5/B5 (ratios de contraste exactos — requieren herramienta en ambos temas), C7 (código de permiso de `rrhh/puestos` contra `seguridad.permisos`).
- **No se ejecutó** la app ni se tomaron capturas (acordado: auditoría estática). No se tocó la BD ni se corrieron comandos destructivos.
- `pnpm audit`: 13 vulnerabilidades (1 alta, 11 moderadas, 1 baja); detalle en `DEP1`.

---

## 6. Estado de correcciones (2026-11-19)

| ID | Estado | Nota |
|----|--------|------|
| C1 | ✅ | Botón "Anular venta" en el detalle (solo con `POS_ANULAR_VENTA` y estado ≠ ANULADA); diálogo `AnularVentaDialogo.jsx` con motivo obligatorio (5–255, igual que Zod). |
| C2 | ✅ | `api.getConMeta()` devuelve `{ data, meta }` con X-Page/X-Total/X-Has-Next-Page; helper `api/paginacion.js`. |
| C3 | ✅ | Kárdex recorre páginas hasta 500 y muestra el total real del servidor si se corta. |
| C4 | ✅ | CxP y Compras usan `listarTodasLasCuentasPorPagar` (todas las páginas). |
| B1 | ✅ | Hook `useTrampaFoco` (misma lógica que `Dialogo`) en InsumoDrawer, drawer de productos, modal de receta y modal de unidad. |
| B2 | ✅ | `aria-invalid` + `aria-describedby` en los campos citados. |
| B3 | ✅ | Enlace "Saltar al contenido" → `<main id="contenido-principal">`. |
| A1/A2/A3 | ✅ | `bg-muted`; se quitó el override de fuente display; Splash usa `var(--color-espresso-*)`. |
| C5/C6 | ✅ | `CONTEXT.md` corregido; import muerto `PendienteApiPage` eliminado. |
| C7 | ✅ verificado | El backend protege `/rrhh/puestos` con el mismo permiso; no existe uno específico en `seguridad.permisos`. |
| C8 | ✅ | Ruta `*` usa el `PaginaNoEncontrada` existente (404) en lugar de redirigir en silencio. |
| C9/D4 | ✅ | Solo sesiones `admin`; `algorithms: ['HS256']` en verify y sign. |
| D2/D3 | ✅ | `express.json({ limit: '100kb' })`; rate limit global 300 req/min (`middlewares/rateLimit.js`). |
| D1 | ⏳ | Requiere decisión: `01_schema.sql` no se edita por regla; propuesta: migración que fuerce cambio de contraseña o no sembrar admin en prod. |
| DEP1 | ⏳ | Actualizar react-router ≥7.18, uuid y vite exige revisar breaking changes; pendiente en rama aparte. |
| A4, B4 | ⏳ | Deuda menor (arte decorativo del login; `<li role="button">` ya accesible). |
| A5/B5 | ⏳ | El caso de `ProductoCard` es estado deshabilitado (exento de AA); medir placeholders en ambos temas. |
