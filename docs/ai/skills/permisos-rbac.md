---
name: permisos-rbac
description: Agregar o proteger funcionalidades con el sistema de roles y permisos dinámico.
---
Modelo: usuario → rol → permisos (`seguridad.*`). El ADMIN crea roles y marca permisos desde la UI.
Nuevo permiso: migración con `INSERT INTO seguridad.permisos(codigo, modulo, descripcion)` y asignación a roles (ver skill `cambio-base-datos`). Código en MAYÚSCULAS `MODULO_ACCION`.
Backend: `requirePermiso('CODIGO')` en la ruta (usa `seguridad.fn_tiene_permiso`). Nunca confiar solo en el frontend.
Frontend: `useAuth().tiene('CODIGO')` para ocultar menús/botones; `<ProtectedRoute permiso="CODIGO">` para rutas.
Login devuelve `{ token, usuario, permisos[] }`; el token JWT lleva `{ id, rol }`.
