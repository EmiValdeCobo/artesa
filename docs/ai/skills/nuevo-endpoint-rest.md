---
name: nuevo-endpoint-rest
description: Crear un endpoint REST nuevo en el backend (ruta, controller, service, repository, permiso, validación).
---
Antes: mira `docs/ai/DB_MAP.md` (tablas/funciones) y copia el patrón de `backend/src/modules/auth/`.
1. `modules/<m>/<m>.routes.js`: `router.METODO('/ruta', authenticate, requirePermiso('CODIGO'), validate(schema), asyncHandler(controller.fn))`.
2. `<m>.schemas.js`: esquema Zod del body/params.
3. `<m>.controller.js`: solo HTTP (lee req, llama service, responde con el código correcto: 201 al crear, 204 sin cuerpo).
4. `<m>.service.js`: reglas de negocio; lanza `new AppError(mensaje, status)`. Escrituras → `withTransaction(fn, req.user.id)`.
5. `<m>.repository.js`: SQL parametrizado ($1…). Para operaciones críticas LLAMA la función SQL (skill `usar-funciones-sql`).
6. Registra el router en `backend/src/modules/index.js` bajo `/api/<recurso-plural>`.
7. Prueba con curl/Postman (login → token → endpoint). Luego skill `registrar-cambio`.
REST: GET lista/detalle, POST crea, PUT/PATCH edita, DELETE desactiva (preferir `activo=false`).
