---
name: cambio-base-datos
description: Modificar la base de datos (tablas, funciones, vistas, semillas) sin romper al equipo.
---
1. NO edites `database/init/01_schema.sql`. Crea `database/migrations/NNN_descripcion.sql` (NNN consecutivo; mira el último con `ls database/migrations`).
2. La migración debe ser idempotente cuando se pueda (`IF NOT EXISTS`, `CREATE OR REPLACE`).
3. Respeta esquemas: tabla de ventas → `pos`, stock → `inventario`, etc. Nombres en español, snake_case.
4. Todo cambio de stock pasa por `inventario.fn_mover_stock` (deja kardex). Todo permiso nuevo: `INSERT INTO seguridad.permisos` + asignarlo a roles en `roles_permisos`.
5. Prueba en tu BD local: `psql -d origenes -f database/migrations/NNN_*.sql`.
6. Actualiza `docs/ai/DB_MAP.md` (solo las líneas afectadas) y avisa al equipo en el PR. Luego skill `registrar-cambio`.
