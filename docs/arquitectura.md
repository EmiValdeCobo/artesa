# Arquitectura de artesa

```mermaid
flowchart LR
  UI[React + Vite] -->|fetch /api, cookie httpOnly| API[Express API]
  API --> AUTH[authenticate: JWT + usuario activo]
  AUTH --> TIPO[requireTipo: admin/cliente]
  TIPO --> RBAC[requirePermiso: consulta conjunta de permisos]
  RBAC --> DB[(PostgreSQL 16)]
  DB --> SQL[Funciones PL/pgSQL críticas]
  API --> MIG[Runner Node de migraciones y seeders]
```

## Autenticación

```mermaid
sequenceDiagram
  participant U as Navegador
  participant A as API
  participant D as PostgreSQL
  U->>A: POST /api/auth/login
  A->>D: Busca usuario activo y compara bcrypt
  A-->>U: Set-Cookie artesa_session (httpOnly, SameSite)
  U->>A: Request con cookie
  A->>A: Verifica JWT (jti, iat, expiración)
  A->>D: Revalida activo=true en cada request
  A-->>U: 401 si fue desactivado; continúa si está activo
```

## Roles y permisos

```mermaid
flowchart TD
  Usuario --> Rol
  Rol --> RolesPermisos[roles_permisos]
  RolesPermisos --> Permiso
  Request --> Tipo[requireTipo admin]
  Tipo --> Codigo[requirePermiso CODIGO]
  Codigo --> Decision{Permiso asignado}
  Decision -->|sí| Ruta[Controller / Service]
  Decision -->|no| Forbidden[403]
```
