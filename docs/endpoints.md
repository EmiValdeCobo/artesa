# Endpoints implementados

Todas las respuestas de error usan `{ "error": "texto" }`, con `detalles` adicional para validaciones.

| Método | Ruta | Autenticación | Permiso | Cuerpo | Respuestas principales |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | No | — | `{username,password}` | 200; 400; 401; 429 |
| POST | `/api/auth/cliente/login` | No | — | `{username,password}` | 200; 400; 401; 429 |
| POST | `/api/auth/logout` | Cookie JWT | — | — | 204; 401 |
| GET | `/api/auth/me` | Cookie JWT + tipo admin | — | — | 200; 401; 403 |
| GET | `/api/auth/cliente/me` | Cookie JWT + tipo cliente | — | — | 200; 401; 403 |
| GET | `/api/seguridad/usuarios` | Cookie JWT + tipo admin | `SEG_GESTIONAR_USUARIOS` | — | 200; 401; 403 |
| GET | `/api/seguridad/roles` | Cookie JWT + tipo admin | `SEG_GESTIONAR_USUARIOS` | — | 200; 401; 403 |
| GET | `/api/seguridad/sucursales` | Cookie JWT + tipo admin | `SEG_GESTIONAR_USUARIOS` | — | 200; 401; 403 |
| POST | `/api/seguridad/usuarios` | Cookie JWT + tipo admin | `SEG_GESTIONAR_USUARIOS` | `{username,password,idRol,sucursales[]}` | 201; 400; 401; 403; 409 |
| PUT | `/api/seguridad/usuarios/:id` | Cookie JWT + tipo admin | `SEG_GESTIONAR_USUARIOS` | `{username,password?,idRol,sucursales[]}` | 200; 400; 401; 403; 404; 409 |
| DELETE | `/api/seguridad/usuarios/:id` | Cookie JWT + tipo admin | `SEG_GESTIONAR_USUARIOS` | — | 204; 401; 403; 404 |

Un token de cliente nunca alcanza el middleware de permisos de administración: `requireTipo('admin')` devuelve 403 antes de consultar permisos. Un usuario desactivado recibe 401 aunque el JWT siga vigente.
